import React, { useState } from 'react';
import { userManagementService, type CreateUserData } from '../../services/userManagementService';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { Eye, EyeOff, RefreshCw, AlertCircle, CheckCircle, Copy } from 'lucide-react';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated: () => void;
}

export function CreateUserModal({ isOpen, onClose, onUserCreated }: CreateUserModalProps) {
  const [formData, setFormData] = useState<CreateUserData>({
    email: '',
    password: '',
    fullName: '',
    role: 'member',
    jobTitle: '',
    department: '',
    phone: ''
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [passwordValidation, setPasswordValidation] = useState<{ isValid: boolean; errors: string[] }>({ isValid: true, errors: [] });

  const handleInputChange = (field: keyof CreateUserData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
    setSuccess(null);
    
    // Validate password on change
    if (field === 'password') {
      const validation = userManagementService.validatePassword(value);
      setPasswordValidation(validation);
    }
  };

  const generatePassword = () => {
    const newPassword = userManagementService.generateSecurePassword();
    setFormData(prev => ({ ...prev, password: newPassword }));
    setPasswordValidation({ isValid: true, errors: [] });
  };

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(formData.password);
      setSuccess('Password copied to clipboard');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to copy password to clipboard');
    }
  };

  const validateForm = (): string | null => {
    if (!formData.email || !userManagementService.validateEmail(formData.email)) {
      return 'Please enter a valid email address';
    }
    
    if (!formData.password) {
      return 'Password is required';
    }
    
    if (!passwordValidation.isValid) {
      return 'Password does not meet security requirements';
    }
    
    if (!formData.fullName || formData.fullName.trim().length < 2) {
      return 'Full name must be at least 2 characters long';
    }
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await userManagementService.createUser({
        ...formData,
        fullName: formData.fullName.trim(),
        jobTitle: formData.jobTitle?.trim() || undefined,
        department: formData.department?.trim() || undefined,
        phone: formData.phone?.trim() || undefined
      });
      
      setSuccess(`User created successfully! ${result.message}`);
      
      // Reset form
      setFormData({
        email: '',
        password: '',
        fullName: '',
        role: 'member',
        jobTitle: '',
        department: '',
        phone: ''
      });
      
      // Close modal after a short delay
      setTimeout(() => {
        onUserCreated();
      }, 1500);
    } catch (err) {
      console.error('Failed to create user:', err);
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        email: '',
        password: '',
        fullName: '',
        role: 'member',
        jobTitle: '',
        department: '',
        phone: ''
      });
      setError(null);
      setSuccess(null);
      setPasswordValidation({ isValid: true, errors: [] });
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
          <DialogDescription>
            Create a new user account with complete profile information.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="user@company.com"
              required
            />
          </div>

          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name *</Label>
            <Input
              id="fullName"
              value={formData.fullName}
              onChange={(e) => handleInputChange('fullName', e.target.value)}
              placeholder="John Doe"
              required
            />
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select value={formData.role} onValueChange={(value: 'admin' | 'member') => handleInputChange('role', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Administrator</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Job Title */}
          <div className="space-y-2">
            <Label htmlFor="jobTitle">Job Title</Label>
            <Input
              id="jobTitle"
              value={formData.jobTitle}
              onChange={(e) => handleInputChange('jobTitle', e.target.value)}
              placeholder="Software Engineer"
            />
          </div>

          {/* Department */}
          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Input
              id="department"
              value={formData.department}
              onChange={(e) => handleInputChange('department', e.target.value)}
              placeholder="Engineering"
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="+1 (555) 123-4567"
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">Temporary Password *</Label>
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="Enter secure password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={generatePassword}
                className="flex items-center space-x-1"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Generate</span>
              </Button>
              {formData.password && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={copyPassword}
                  className="flex items-center space-x-1"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            {/* Password Validation */}
            {formData.password && !passwordValidation.isValid && (
              <div className="text-sm text-red-600 space-y-1">
                <p className="font-medium">Password must meet the following requirements:</p>
                <ul className="list-disc list-inside space-y-1">
                  {passwordValidation.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {formData.password && passwordValidation.isValid && (
              <div className="flex items-center space-x-2 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>Password meets all security requirements</span>
              </div>
            )}
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !passwordValidation.isValid}
              className="flex items-center space-x-2"
            >
              {loading && <RefreshCw className="h-4 w-4 animate-spin" />}
              <span>{loading ? 'Creating...' : 'Create User'}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}