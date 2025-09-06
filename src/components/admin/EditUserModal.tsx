import React, { useState, useEffect } from 'react';
import { userManagementService, type UpdateUserData, type UserProfile } from '../../services/userManagementService';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

interface EditUserModalProps {
  isOpen: boolean;
  user: UserProfile;
  onClose: () => void;
  onUserUpdated: () => void;
}

export function EditUserModal({ isOpen, user, onClose, onUserUpdated }: EditUserModalProps) {
  const [formData, setFormData] = useState<UpdateUserData>({
    email: '',
    fullName: '',
    role: 'member',
    jobTitle: '',
    department: '',
    status: 'active'
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        jobTitle: user.job_title || '',
        department: user.company || '',
        status: user.status
      });
    }
  }, [user]);

  const handleInputChange = (field: keyof UpdateUserData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
    setSuccess(null);
  };

  const validateForm = (): string | null => {
    if (!formData.email || !userManagementService.validateEmail(formData.email)) {
      return 'Please enter a valid email address';
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
      const updateData: UpdateUserData = {
        email: formData.email?.trim(),
        fullName: formData.fullName?.trim(),
        role: formData.role,
        jobTitle: formData.jobTitle?.trim() || undefined,
        department: formData.department?.trim() || undefined,
        status: formData.status
      };
      
      const result = await userManagementService.updateUser(user.user_id, updateData);
      
      setSuccess(`User updated successfully! ${result.message}`);
      
      // Close modal after a short delay
      setTimeout(() => {
        onUserUpdated();
      }, 1500);
    } catch (err) {
      console.error('Failed to update user:', err);
      setError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      setSuccess(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user information and settings.
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

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status *</Label>
            <Select value={formData.status} onValueChange={(value: 'active' | 'inactive' | 'deleted') => handleInputChange('status', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="deleted">Deleted</SelectItem>
              </SelectContent>
            </Select>
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
              disabled={loading}
              className="flex items-center space-x-2"
            >
              {loading && <RefreshCw className="h-4 w-4 animate-spin" />}
              <span>{loading ? 'Updating...' : 'Update User'}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}