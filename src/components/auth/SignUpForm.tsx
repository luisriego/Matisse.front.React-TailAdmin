import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from 'uuid';
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Button from "../ui/button/Button";
import Select from "../form/Select";

interface ResidentUnitOption {
  value: string;
  label: string;
}

export default function SignUpForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [residentUnitId, setResidentUnitId] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [residentUnits, setResidentUnits] = useState<ResidentUnitOption[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [unitsError, setUnitsError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchResidentUnits = async () => {
      setUnitsLoading(true);
      setUnitsError('');
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          // If no token, user is not logged in, cannot fetch resident units
          // This scenario might happen if user directly navigates to signup without login
          // For now, we'll just log an error or handle it later
          setUnitsError('No authentication token found. Please log in first.');
          setUnitsLoading(false);
          return;
        }

        const response = await fetch('/api/v1/resident-unit/active', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          throw new Error('Failed to fetch resident units');
        }
        const data = await response.json();
        const options = data.map((unit: any) => ({
          value: unit.id,
          label: unit.unit,
        }));
        setResidentUnits(options);
      } catch (err: any) {
        setUnitsError(err.message);
      } finally {
        setUnitsLoading(false);
      }
    };

    fetchResidentUnits();
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const userId = uuidv4();
      const response = await fetch('/api/v1/users/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: userId,
          name,
          email,
          password,
          residentUnitId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to register');
      }

      navigate('/signin'); // Redirect to login page on successful registration
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 w-full overflow-y-auto lg:w-1/2 no-scrollbar">
      <div className="w-full max-w-md mx-auto mb-5 sm:pt-10">
        <Link
          to="/"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeftIcon className="size-5" />
          Back to dashboard
        </Link>
      </div>
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Sign Up
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Create your account to get started.
            </p>
          </div>
          <div>
            <form onSubmit={handleSubmit}>
              <div className="space-y-5">
                <div>
                  <Label>
                    Name<span className="text-error-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label>
                    Email<span className="text-error-500">*</span>
                  </Label>
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label>
                    Password<span className="text-error-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      placeholder="Enter your password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <span
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                    >
                      {showPassword ? (
                        <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      ) : (
                        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      )}
                    </span>
                  </div>
                </div>
                <div>
                  <Label>
                    Resident Unit<span className="text-error-500">*</span>
                  </Label>
                  {unitsLoading ? (
                    <p>Loading units...</p>
                  ) : unitsError ? (
                    <p className="text-error-500">Error: {unitsError}</p>
                  ) : (
                    <Select
                      options={residentUnits}
                      placeholder="Select a unit"
                      onChange={setSelectedResidentUnitId}
                      defaultValue={residentUnitId}
                    />
                  )}
                </div>
                {error && (
                  <div className="text-sm text-center text-error-500">
                    {error}
                  </div>
                )}
                <div>
                  <Button className="w-full" size="sm" disabled={isLoading || unitsLoading || residentUnits.length === 0}>
                    {isLoading ? 'Signing up...' : 'Sign Up'}
                  </Button>
                </div>
              </div>
            </form>

            <div className="mt-5">
              <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
                Already have an account? {""}
                <Link
                  to="/signin"
                  className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
                >
                  Sign In
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}