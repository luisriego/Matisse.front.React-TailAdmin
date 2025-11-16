import { describe, it, expect } from 'vitest';
import { v4 as uuidv4 } from 'uuid'; // Importar v4 de la librería uuid

describe('Resident Unit API', () => {
  it('should create a new resident unit', async () => {
    const newResidentUnit = {
      id: uuidv4(), // Generar un ID único para cada ejecución del test
      unit: 'Apartment 102',
      idealFraction: 0, // Cambiado de 1 a 0
      notificationRecipients: [
        {
          name: 'Peter Jones',
          email: 'peter.jones@example.com',
        },
      ],
    };

    const response = await fetch('http://localhost:1000/api/v1/resident-unit/create', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJpYXQiOjE3NjI2MjI0MTEsImV4cCI6MTc2NTIxNDQxMSwicm9sZXMiOiJST0xFX1VTRVIiLCJ1c2VybmFtZSI6Imx1aXMucmllZ29AYXBpLmNvbSIsImlkIjoiMGE2ZjdmOTQtYjQ0Mi00NTBkLTgwZDctMmJjZTg3YTEyMDE4IiwidXNlciI6Imx1aXMucmllZ29AYXBpLmNvbSIsIm5hbWUiOiJMdWlzIiwidW5pdCI6bnVsbH0.qZV9u0SkI9gi83fhfSu4pClYntUm99aBOoSHplj9eKYyHjZk3hCOfGxudeoEDuXPPAWSw_zf02BqgDbWE-nfTT2OLIouOds9ptOfPl1T533Ql4SynpvY1xdsQv9l2MvXenmJ_EIXn-sO0GvtkzAEfDq4EXW3xeuPNCJjxlCXrZFNcYz8J041Ug_6fCL27Sp_bKK_0jHH0k2WOxeqnvK71pixm7HOFBiKO0GLS1aVTCw_QE3dH6vWNjS7HIm2MTY5xgV0SJlbtZBJgKSb0eOciPhTJeOz_7N5aqt9rjHm5JhNfz0U9lpdmCQnFPGaBas8-BnJ5KkB4a7_HMo6g5GctA',
      },
      body: JSON.stringify(newResidentUnit),
    });

    // Si la respuesta no es 201, intenta leer el cuerpo para obtener más detalles del error
    if (response.status !== 201) {
      const errorBody = await response.json();
      console.error('API Error Response:', errorBody);
    }

    expect(response.status).toBe(201);
  });
});
