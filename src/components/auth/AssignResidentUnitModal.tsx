import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../ui/modal';
import Label from '../form/Label';
import Select from '../form/Select';
import Button from '../ui/button/Button';
import { prefetchCatalogTypes } from '../../utils/catalogCache';

interface AssignResidentUnitModalProps {
  isOpen: boolean;
  userId: string;
  onClose: () => void;
}

interface ResidentUnitOption {
  value: string;
  label: string;
}

const AssignResidentUnitModal: React.FC<AssignResidentUnitModalProps> = ({
  isOpen,
  userId,
  onClose,
}) => {
  const navigate = useNavigate();
  const [residentUnits, setResidentUnits] = useState<ResidentUnitOption[]>([]);
  const [selectedResidentUnitId, setSelectedResidentUnitId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkError, setLinkError] = useState('');

  
  const [wizardStep, setWizardStep] = useState(1);
  const [stepLoading, setStepLoading] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);

  
  const [textData, setTextData] = useState('');

  
  const [accountsList, setAccountsList] = useState<{name: string}[]>([
    { name: 'Conta Principal' }
  ]);

  const [gasType, setGasType] = useState<'p45' | 'p20' | 'm3'>('p45');
  const [cylinderPrice, setCylinderPrice] = useState('');
  const [cylinderQty, setCylinderQty] = useState('1');
  const [gasM3Price, setGasM3Price] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchResidentUnits();
    }
  }, [isOpen]);

  const fetchResidentUnits = async () => {
    setIsLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Token de autenticação não encontrado.');

      const response = await fetch('/api/v1/resident-unit/actives', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const responseText = await response.text();

      if (!response.ok) {
        try {
          const errorData = JSON.parse(responseText);
          throw new Error(errorData.message || 'Falha ao buscar unidades residenciais');
        } catch (e) {
          throw new Error(`Falha ao buscar unidades residenciais. Servidor respondeu com status ${response.status}`);
        }
      }

      let data = JSON.parse(responseText);
      if (data && data.data) data = data.data;
      if (data && data.content) data = data.content;

      if (Array.isArray(data)) {
        const options = data.map((unit: any) => ({
          value: unit.id || unit.uuid,
          label: unit.unit || unit.name || 'Unidade',
        }));
        setResidentUnits(options);
        
        if (options.length > 0) {
          setWizardStep(0);
        }
      } else {
        setResidentUnits([]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkResidentUnit = async () => {
    if (!selectedResidentUnitId) {
      setLinkError('Por favor, selecione uma unidade residencial.');
      return;
    }
    setLinkLoading(true);
    setLinkError('');
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Token de autenticação não encontrado.');

      const response = await fetch(`/api/v1/users/${userId}/resident-unit`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ residentUnitId: selectedResidentUnitId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao vincular unidade residencial');
      }

      onClose();
      navigate('/');
    } catch (err: any) {
      setLinkError(err.message);
    } finally {
      setLinkLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setTextData(event.target.result.toString());
      }
    };
    reader.readAsText(file);
  };

  const addAccountField = () => {
    setAccountsList([...accountsList, { name: '' }]);
  };

  const updateAccountField = (index: number, value: string) => {
    const newAccounts = [...accountsList];
    newAccounts[index].name = value;
    setAccountsList(newAccounts);
  };

  const validateStep2 = () => {
    setStepError(null);
    const lines = textData.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length === 0) {
      setStepError("A lista de unidades não pode estar vazia.");
      return;
    }
    const overLimit = lines.filter(line => line.length > 10);
    if (overLimit.length > 0) {
      setStepError(`O banco de dados aceita no máximo 10 caracteres por unidade. Corrija: ${overLimit.slice(0, 3).join(', ')}...`);
      return;
    }
    setWizardStep(3);
  };

  const validateStep3 = () => {
    setStepError(null);
    const validAccounts = accountsList.filter(acc => acc.name.trim());
    if (validAccounts.length === 0) {
      setStepError('Você deve cadastrar ao menos uma conta contábil principal.');
      return;
    }
    setWizardStep(4);
  };

  const submitCompleteWizard = async () => {
    setStepLoading(true);
    setStepError(null);
    
    
    let amountInCents = 0;
    if (gasType === 'p45' || gasType === 'p20') {
      const cleanPrice = cylinderPrice.replace(/\./g, '').replace(',', '.');
      const priceVal = parseFloat(cleanPrice) || 0;
      const qtyVal = parseInt(cylinderQty) || 0;
      amountInCents = Math.round(priceVal * qtyVal * 100);
      if (amountInCents <= 0) {
         setStepError('O valor e a quantidade do cilindro devem ser maiores que zero.');
         setStepLoading(false);
         return;
      }
    } else if (gasType === 'm3') {
      const cleanPrice = gasM3Price.replace(/\./g, '').replace(',', '.');
      amountInCents = Math.round(parseFloat(cleanPrice) * 100);
      if (amountInCents <= 0) {
         setStepError('O preço direto do m³ deve ser maior que zero.');
         setStepLoading(false);
         return;
      }
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Token não encontrado.");

      
      const lines = textData.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      const chunkArray = (array: string[], size: number) => {
        const result = [];
        for (let i = 0; i < array.length; i += size) {
          result.push(array.slice(i, i + size));
        }
        return result;
      };
      const chunks = chunkArray(lines, 5);

      for (const chunk of chunks) {
        const promises = chunk.map(unit => {
          return fetch('/api/v1/resident-unit/create', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ id: crypto.randomUUID(), unit: unit, idealFraction: 0.1, isActive: true, notificationRecipients: [] })
          }).then(async res => {
            if (!res.ok) {
              const dataStr = await res.text();
              throw new Error(`Erro ao criar a unidade "${unit}": ${dataStr}`);
            }
            return res;
          });
        });
        await Promise.all(promises);
      }

      
      let accIndex = 1;
      for (const acc of accountsList.filter(a => a.name.trim())) {
        const randLetters = String.fromCharCode(65 + Math.floor(Math.random() * 26), 65 + Math.floor(Math.random() * 26));
        const randNumbers = Math.floor(10 + Math.random() * 90).toString();
        const generatedCode = `C${randLetters}${randNumbers}`;
        const res = await fetch('/api/v1/accounts/create', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ id: crypto.randomUUID(), code: generatedCode, name: acc.name, isActive: true })
        });
        if (!res.ok) {
           const dataStr = await res.text();
           throw new Error(`Erro ao criar a conta "${acc.name}": ${dataStr}`);
        }
        accIndex++;
      }

      
      const gasEndpoint = gasType === 'm3' ? '/api/v1/gas/price/direct' : '/api/v1/gas/price';
      const gasBody = gasType === 'm3' 
        ? { pricePerM3InCents: amountInCents, price_per_m3_in_cents: amountInCents } 
        : { billAmountInCents: amountInCents };
        
      const res = await fetch(gasEndpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(gasBody)
      });
      if (!res.ok) throw new Error('Falha ao definir o preço do gás no servidor.');
      
      let retries = 0;
      let unitsFound = false;
      
      while (retries < 5 && !unitsFound) {
         await new Promise(r => setTimeout(r, 1500));
         const checkRes = await fetch('/api/v1/resident-unit/actives', {
           headers: { 'Authorization': `Bearer ${token}` }
         });
         
         if (checkRes.ok) {
            let checkData = await checkRes.json();
            if (checkData && checkData.data) checkData = checkData.data;
            if (checkData && checkData.content) checkData = checkData.content;
            
            if (Array.isArray(checkData) && checkData.length > 0) {
               unitsFound = true;
            }
         }
         retries++;
      }
      
      if (!unitsFound) {
         setStepError("Operação salva, mas o backend não retornou as unidades como ativas. O servidor de banco não as devolveu ainda. Recarregue a página com F5.");
         setStepLoading(false);
         return;
      }

      try {
        await prefetchCatalogTypes(token);
      } catch {
        
      }
      
      setStepError(null);
      setTextData('');
      setWizardStep(0);
      await fetchResidentUnits();
    } catch (e: any) {
      setStepError(e.message || 'Falha ao finalizar configuração final.');
    } finally {
      setStepLoading(false);
    }
  };

  const handleModalClose = () => {};

  return (
    <Modal isOpen={isOpen} onClose={handleModalClose} showCloseButton={false} className="max-w-xl mx-auto">
      <div className="p-6">
        {isLoading ? (
          <p>Carregando dados estruturais...</p>
        ) : error ? (
          <p className="text-error-500">Erro: {error}</p>
        ) : residentUnits.length === 0 && wizardStep > 0 ? (
          
          <div className="flex flex-col gap-4">
            <h3 className="mb-2 text-xl font-semibold text-gray-800 dark:text-white/90">
              Assistente de Inicialização (Passo {wizardStep} de 4)
            </h3>
            
            {}
            {wizardStep === 1 && (
              <div>
                <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                  Bem-vindo! Como este é o primeiro acesso, precisamos inicializar os parâmetros básicos do edifício para que o sistema funcione perfeitamente.
                  <br /><br />
                  <strong>Diferente de sistemas engessados, garantiremos que seus dados sejam salvos e validados passo-a-passo:</strong>
                </p>
                <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <li><strong>Unidades Residenciais:</strong> Cadastro de todas os apartamentos.</li>
                  <li><strong>Contas Contábeis:</strong> Definição das contas contábeis base (Caixa, Receitas, etc).</li>
                  <li><strong>Custo do Gás:</strong> Configuração simplificada da fatura.</li>
                  <li><strong>Tipos de despesa e ingresso:</strong> Sincronização automática com o servidor ao concluir.</li>
                </ol>
                <div className="mt-8 flex justify-end">
                  <Button onClick={() => setWizardStep(2)}>Começar Configuração</Button>
                </div>
              </div>
            )}

            {wizardStep === 2 && (
              <div>
                <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                  Cadastre as unidades. O sistema irá validá-las antes de gerá-las no banco de dados.
                </p>
                <div className="mb-4">
                  <Label>Ou carregue via Arquivo .txt / .csv</Label>
                  <input 
                    type="file" accept=".txt,.csv" onChange={handleFileUpload}
                    className="block w-full text-sm mt-1 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:bg-brand-50 hover:file:bg-brand-100"
                  />
                </div>
                <div>
                  <Label>Unidades Residenciais (Máx 10 caracteres por linha)</Label>
                  <textarea
                    rows={6} value={textData} onChange={(e) => setTextData(e.target.value)}
                    placeholder={"Exemplo:\nApto 101\nApto 102"}
                    className="w-full mt-1 rounded-lg border border-gray-300 px-4 py-3 text-sm focus:ring-brand-500/20"
                    disabled={stepLoading}
                  />
                </div>
                {stepError && <div className="mt-3 text-sm text-error-500">{stepError}</div>}
                
                <div className="mt-6 flex justify-between">
                  <Button variant="outline" disabled={stepLoading} onClick={() => setWizardStep(1)}>Voltar</Button>
                  <button 
                    disabled={stepLoading || !textData.trim()} 
                    onClick={validateStep2} 
                    className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50"
                  >
                    Salvar Unidades e Avançar
                  </button>
                </div>
              </div>
            )}

            {wizardStep === 3 && (
              <div>
                <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                  Defina as contas contábeis (ex: Conta Corrente principal, Fundo de Reserva, etc.) para gerir o balanço financeiro do edifício. Pelo menos uma conta é necessária para prosseguir.
                </p>
                <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                  {accountsList.map((acc, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <div className="flex-1">
                        <Label>Nome da Conta</Label>
                        <input
                          type="text" value={acc.name} onChange={(e) => updateAccountField(index, e.target.value)}
                          className="w-full mt-1 rounded-lg border px-3 py-2 text-sm" placeholder="Ex: Conta Principal"
                          disabled={stepLoading}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addAccountField} className="text-sm text-brand-500 hover:underline">
                  + Adicionar outra conta
                </button>
                {stepError && <div className="mt-3 text-sm text-error-500">{stepError}</div>}
                
                <div className="mt-6 flex justify-between">
                  <Button variant="outline" disabled={stepLoading} onClick={() => setWizardStep(2)}>Voltar</Button>
                  <button 
                    disabled={stepLoading || !accountsList[0].name.trim()} 
                    onClick={validateStep3} 
                    className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50"
                  >
                    Salvar Contas e Avançar
                  </button>
                </div>
              </div>
            )}

            {wizardStep === 4 && (
              <div>
                <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                  Selecione o formato de abastecimento de gás do seu condomínio. O sistema processa tudo ocultamente na API matríx.
                </p>
                
                <div className="grid grid-cols-3 gap-4 mb-6">
                   <button onClick={() => setGasType('p45')} className={`p-4 px-2 rounded-xl border flex flex-col items-center justify-end gap-1 transition-all ${gasType === 'p45' ? 'border-brand-500 bg-brand-50 shadow-theme-xs' : 'border-gray-200 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800'}`}>
                      <svg viewBox="0 0 100 200" className="w-[3.3rem] h-[6.6rem] mb-2 drop-shadow-md">
                        <defs>
                          <linearGradient id="gold-p45" x1="0" x2="1">
                            <stop offset="0%" stopColor="#bf953f" />
                            <stop offset="30%" stopColor="#fcf6ba" />
                            <stop offset="50%" stopColor="#b38728" />
                            <stop offset="70%" stopColor="#fbf5b7" />
                            <stop offset="100%" stopColor="#aa771c" />
                          </linearGradient>
                        </defs>
                        <path d="M30 15 L32 35 L68 35 L70 15 Z" fill="url(#gold-p45)" />
                        <rect x="25" y="10" width="50" height="7" rx="3" fill="url(#gold-p45)" />
                        <rect x="36" y="17" width="28" height="10" rx="4" fill="currentColor" className="text-white dark:text-gray-900 transition-colors" />
                        <rect x="46" y="32" width="8" height="16" fill="#71717a" />
                        <rect x="42" y="38" width="16" height="5" fill="#f59e0b" />
                        <path d="M20 70 Q50 35 80 70 L80 180 Q50 190 20 180 Z" fill="url(#gold-p45)" />
                        <path d="M20 70 Q50 55 80 70" fill="none" stroke="#a16207" strokeWidth="1" opacity="0.3" />
                        <path d="M20 130 L80 130" fill="none" stroke="#a16207" strokeWidth="1" opacity="0.4" />
                        <path d="M25 180 L22 195 Q50 200 78 195 L75 180 Z" fill="url(#gold-p45)" />
                        <rect x="35" y="185" width="10" height="10" fill="currentColor" className="text-white dark:text-gray-900 transition-colors" />
                        <rect x="55" y="185" width="10" height="10" fill="currentColor" className="text-white dark:text-gray-900 transition-colors" />
                      </svg>
                      <span className="font-semibold text-xs text-gray-800 dark:text-white/90 text-center mt-auto">Cilindro P45<br/><span className="text-[10px] text-gray-500 font-normal">Residencial / Comum</span></span>
                   </button>

                   <button onClick={() => setGasType('p20')} className={`p-4 px-2 rounded-xl border flex flex-col items-center justify-end gap-1 transition-all ${gasType === 'p20' ? 'border-brand-500 bg-brand-50 shadow-theme-xs' : 'border-gray-200 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800'}`}>
                      <svg viewBox="0 0 100 150" className="w-[3.8rem] h-[5.5rem] mb-2 drop-shadow-md">
                        <defs>
                          <linearGradient id="gold-p20" x1="0" x2="1">
                            <stop offset="0%" stopColor="#bf953f" />
                            <stop offset="30%" stopColor="#fcf6ba" />
                            <stop offset="50%" stopColor="#b38728" />
                            <stop offset="70%" stopColor="#fbf5b7" />
                            <stop offset="100%" stopColor="#aa771c" />
                          </linearGradient>
                        </defs>
                        <path d="M30 20 L32 40 L68 40 L70 20 Z" fill="url(#gold-p20)" />
                        <rect x="25" y="15" width="50" height="7" rx="3" fill="url(#gold-p20)" />
                        <rect x="36" y="22" width="28" height="12" rx="4" fill="currentColor" className="text-white dark:text-gray-900 transition-colors" />
                        <rect x="46" y="32" width="8" height="20" fill="#71717a" />
                        <rect x="42" y="38" width="16" height="5" fill="#f59e0b" />
                        <path d="M10 75 Q50 40 90 75 L90 135 Q50 145 10 135 Z" fill="url(#gold-p20)" />
                        <path d="M10 75 Q50 60 90 75" fill="none" stroke="#a16207" strokeWidth="1" opacity="0.3" />
                        <path d="M10 110 L90 110" fill="none" stroke="#a16207" strokeWidth="1" opacity="0.4" />
                        <path d="M15 135 L12 145 Q50 150 88 145 L85 135 Z" fill="url(#gold-p20)" />
                        <rect x="25" y="137" width="12" height="10" fill="currentColor" className="text-white dark:text-gray-900 transition-colors" />
                        <rect x="63" y="137" width="12" height="10" fill="currentColor" className="text-white dark:text-gray-900 transition-colors" />
                      </svg>
                      <span className="font-semibold text-xs text-gray-800 dark:text-white/90 text-center mt-auto">Cilindro P20<br/><span className="text-[10px] text-gray-500 font-normal">Menor / Industrial</span></span>
                   </button>

                   <button onClick={() => setGasType('m3')} className={`p-4 px-2 rounded-xl border flex flex-col items-center justify-end gap-1 transition-all ${gasType === 'm3' ? 'border-brand-500 bg-brand-50 shadow-theme-xs' : 'border-gray-200 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800'}`}>
                      <svg className="w-12 h-12 text-orange-500 mb-6 drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
                      </svg>
                      <span className="font-semibold text-xs text-gray-800 dark:text-white/90 text-center mt-auto">Valor Direto<br/><span className="text-[10px] text-gray-500 font-normal">Gás Encanado / m³</span></span>
                   </button>
                </div>

                {gasType !== 'm3' ? (
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <Label>Preço unitário do Cilindro {gasType.toUpperCase()} (R$)</Label>
                      <input
                        type="text" value={cylinderPrice} onChange={(e) => setCylinderPrice(e.target.value)}
                        placeholder={gasType === 'p45' ? 'Ex: 450,00' : 'Ex: 200,00'}
                        className="w-full mt-1 rounded-lg border px-3 py-2 text-sm"
                        disabled={stepLoading}
                      />
                    </div>
                    <div className="w-1/3">
                      <Label>Qtde Comprada</Label>
                      <input
                        type="number" min="1" value={cylinderQty} onChange={(e) => setCylinderQty(e.target.value)}
                        className="w-full mt-1 rounded-lg border px-3 py-2 text-sm"
                        disabled={stepLoading}
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-[11.5px] text-gray-500 dark:text-gray-400 mb-3 leading-relaxed">
                      Este formulário gravará diretamente o valor tarifário estático do m³ de Gás consumido no seu condomínio sem passar pelo rateio da fatura matriz.
                    </p>
                    <div className="flex gap-4">
                      <div className="flex-1 max-w-[50%]">
                        <Label>Preço Direto do m³ de Gás (R$)</Label>
                        <input
                          type="text" value={gasM3Price} onChange={(e) => setGasM3Price(e.target.value)}
                          placeholder="Ex: 26,00"
                          className="w-full mt-1 rounded-lg border px-3 py-2 text-sm focus:border-brand-500 active:border-brand-500"
                          disabled={stepLoading}
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {stepError && <div className="mt-4 text-sm text-error-600 bg-error-50 p-2 px-3 rounded-lg border border-error-200">{stepError}</div>}
                
                <div className="mt-8 flex justify-between">
                  <Button variant="outline" disabled={stepLoading} onClick={() => setWizardStep(3)}>Voltar</Button>
                  <button
                    onClick={submitCompleteWizard}
                    disabled={stepLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-lg transition px-4 py-2 text-sm bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:opacity-50"
                  >
                    {stepLoading ? 'Salvando Definitivo...' : 'Finalizar Configuração Completa'}
                  </button>
                </div>
              </div>
            )}
          </div>

        ) : (
          
          <div className="space-y-4">
            <h3 className="mb-4 text-xl font-semibold text-gray-800 dark:text-white/90">
              Atribuir Unidade Residencial
            </h3>
            <p className="mb-6 text-gray-500 dark:text-gray-400">
              O edifício já possui configurações registradas. Por favor, selecione qual é a sua unidade residencial de administrador para concluir.
            </p>
            <div>
              <Label>Unidade Residencial</Label>
              <Select
                options={residentUnits}
                placeholder="Selecione uma unidade"
                onChange={setSelectedResidentUnitId}
                defaultValue={selectedResidentUnitId}
              />
            </div>
            {linkError && <div className="text-sm text-center text-error-500">{linkError}</div>}
            <Button
              className="w-full"
              size="sm"
              onClick={handleLinkResidentUnit}
              disabled={linkLoading || !selectedResidentUnitId}
            >
              {linkLoading ? 'Atribuindo...' : 'Atribuir Minha Unidade'}
            </Button>
          </div>

        )}
      </div>
    </Modal>
  );
};

export default AssignResidentUnitModal;
