import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ReportsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="p-6">
      <Alert>
        <ArrowRight className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>This page has been upgraded with comprehensive real-time analytics.</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.location.reload()}
          >
            View New Analytics
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default ReportsPage;