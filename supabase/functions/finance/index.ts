import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

declare const Deno: any;

interface Invoice {
  id?: string;
  client_id?: string;
  project_id?: string;
  title?: string;
  amount?: number;
  tax_amount?: number;
  total_amount?: number;
  currency?: string;
  status?: 'draft' | 'sent' | 'paid' | 'overdue';
  invoice_number?: string;
  due_date?: string;
  sent_date?: string;
  paid_date?: string;
  payment_method?: string;
  payment_reference?: string;
  line_items?: any[];
  billing_address?: string;
  notes?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

interface InvoiceItem {
  id?: string;
  invoice_id?: string;
  description: string;
  quantity: number;
  rate: number;
  amount?: number;
}

interface Expense {
  id?: string;
  description: string;
  amount: number;
  category: string;
  expense_date?: string;
  receipt_url?: string;
  project_id?: string;
  is_billable?: boolean;
  created_at?: string;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200, 
      headers: corsHeaders 
    });
  }

  try {
    // Initialize Supabase client with error handling
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request data
    let requestData: any = {};
    try {
      requestData = await req.json();
    } catch {
      requestData = {};
    }

    const { action } = requestData;

    switch (action) {
      case 'create_invoice': {
        const invoiceData = requestData.params || requestData;
        const {
          client_name,
          client_email,
          client_company,
          client_address,
          client_phone,
          invoice_number,
          issue_date,
          due_date,
          payment_terms,
          payment_method,
          line_items = [],
          subtotal,
          tax_rate = 0,
          tax_amount,
          discount_amount = 0,
          discount_type = 'fixed',
          total_amount,
          notes,
          terms_and_conditions,
          project_id,
          status = 'draft'
        } = invoiceData;

        // Validate required fields
        if (!client_name) {
          throw new Error('Client name is required');
        }
        if (!total_amount || total_amount <= 0) {
          throw new Error('Total amount must be greater than zero');
        }
        
        // If line items are empty, create a default one from the total amount
        let processedLineItems = line_items;
        if (!line_items || line_items.length === 0) {
          processedLineItems = [{
            description: notes || `Service for ${client_name}`,
            quantity: 1,
            unit_price: subtotal || total_amount || 0,
            line_total: subtotal || total_amount || 0
          }];
        }

        // Get authenticated user
        const authHeader = req.headers.get('Authorization');
        const { data: { user }, error: authError } = await supabase.auth.getUser(
          authHeader?.replace('Bearer ', '') || ''
        );

        if (authError || !user) {
          throw new Error('Authentication required');
        }

        // Create invoice with fields that actually exist in the database
        const newInvoiceData = {
          invoice_number: invoice_number || `INV-${Date.now()}`,
          user_id: user.id,
          client_name,
          client_email: client_email || null,
          client_company: client_company || null,
          amount: subtotal || total_amount || 0, // Map subtotal to amount field
          tax_rate: parseFloat(tax_rate) || 0,
          tax_amount: parseFloat(tax_amount) || 0,
          total_amount: parseFloat(total_amount) || 0,
          status: status || 'draft',
          issue_date: issue_date || new Date().toISOString().split('T')[0],
          due_date: due_date || null,
          description: notes || `Invoice for ${client_name}`,
          line_items: JSON.stringify(processedLineItems), // Use processed line items
          payment_method: payment_method || null,
          notes: `${notes || ''}${terms_and_conditions ? '\n\nTerms: ' + terms_and_conditions : ''}`.trim() || null
        };

        const { data: invoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert([newInvoiceData])
          .select()
          .single();

        if (invoiceError) {
          console.error('Invoice creation error:', invoiceError);
          throw new Error(`Failed to create invoice: ${invoiceError.message}`);
        }

        // Award points for invoice creation
        try {
          await supabase.functions.invoke('points-manager', {
            body: {
              action: 'update_user_rank',
              userId: user.id,
              pointsEarned: 15 // Points for creating an invoice
            }
          });
        } catch (pointsError) {
          console.error('Failed to award points:', pointsError);
          // Don't fail the invoice creation if points fail
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            data: invoice,
            points_earned: 15
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 201 
          }
        );
      }

      case 'create_expense': {
        const {
          description,
          amount,
          category,
          date = new Date().toISOString().split('T')[0],
          receipt_url,
          notes,
          project_id,
          is_billable = false,
          vendor,
          payment_method
        } = requestData;

        // Get authenticated user for expenses
        const authHeader = req.headers.get('Authorization');
        const { data: { user }, error: authError } = await supabase.auth.getUser(
          authHeader?.replace('Bearer ', '') || ''
        );

        if (authError || !user) {
          throw new Error('Authentication required');
        }

        const expenseData = {
          user_id: user.id,
          description,
          amount,
          category,
          date: date || new Date().toISOString().split('T')[0],
          receipt_url: receipt_url || null,
          metadata: JSON.stringify({
            notes: notes || null,
            project_id: project_id || null,
            is_billable: is_billable || false,
            vendor: vendor || null,
            payment_method: payment_method || null
          })
        };

        const { data: expense, error } = await supabase
          .from('expenses')
          .insert([expenseData])
          .select()
          .single();

        if (error) {
          throw new Error(`Failed to create expense: ${error.message}`);
        }

        return new Response(
          JSON.stringify({ success: true, data: expense }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 201 
          }
        );
      }

      case 'get_financial_summary': {
        const { 
          period = 'month',
          start_date,
          end_date
        } = requestData;

        // Calculate date range
        const now = new Date();
        let startDate: Date, endDate: Date = now;
        
        if (start_date && end_date) {
          startDate = new Date(start_date);
          endDate = new Date(end_date);
        } else {
          switch (period) {
            case 'week':
              startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              break;
            case 'month':
              startDate = new Date(now.getFullYear(), now.getMonth(), 1);
              break;
            case 'quarter': {
              const quarter = Math.floor(now.getMonth() / 3);
              startDate = new Date(now.getFullYear(), quarter * 3, 1);
              break;
            }
            case 'year':
              startDate = new Date(now.getFullYear(), 0, 1);
              break;
            default:
              startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          }
        }

        // Get invoices summary
        const { data: invoices, error: invoicesError } = await supabase
          .from('invoices')
          .select('status, total_amount, created_at')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString());

        if (invoicesError) {
          throw new Error(`Failed to fetch invoices: ${invoicesError.message}`);
        }

        // Get expenses summary
        const { data: expenses, error: expensesError } = await supabase
          .from('expenses')
          .select('amount, category, date, metadata')
          .gte('date', startDate.toISOString().split('T')[0])
          .lte('date', endDate.toISOString().split('T')[0]);

        if (expensesError) {
          throw new Error(`Failed to fetch expenses: ${expensesError.message}`);
        }

        // Calculate summary
        const totalRevenue = invoices
          ?.filter(inv => inv.status === 'paid')
          .reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;
        
        const pendingRevenue = invoices
          ?.filter(inv => inv.status === 'sent')
          .reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;
        
        const overdueRevenue = invoices
          ?.filter(inv => inv.status === 'overdue')
          .reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;
        
        const totalExpenses = expenses
          ?.reduce((sum, exp) => sum + exp.amount, 0) || 0;
        
        const billableExpenses = expenses
          ?.filter(exp => {
            try {
              const metadata = exp.metadata ? JSON.parse(exp.metadata) : {};
              return metadata.is_billable === true;
            } catch {
              return false;
            }
          })
          .reduce((sum, exp) => sum + exp.amount, 0) || 0;
        
        const netProfit = totalRevenue - totalExpenses;
        
        // Expense breakdown by category
        const expensesByCategory = expenses?.reduce((acc: Record<string, number>, exp) => {
          acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
          return acc;
        }, {}) || {};

        const summary = {
          period,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          revenue: {
            total: Math.round(totalRevenue * 100) / 100,
            pending: Math.round(pendingRevenue * 100) / 100,
            overdue: Math.round(overdueRevenue * 100) / 100
          },
          expenses: {
            total: Math.round(totalExpenses * 100) / 100,
            billable: Math.round(billableExpenses * 100) / 100,
            by_category: Object.entries(expensesByCategory).map(([category, amount]) => ({
              category,
              amount: Math.round((amount as number) * 100) / 100
            }))
          },
          profit: {
            net: Math.round(netProfit * 100) / 100,
            margin: totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100 * 100) / 100 : 0
          },
          invoices: {
            total: invoices?.length || 0,
            paid: invoices?.filter(inv => inv.status === 'paid').length || 0,
            pending: invoices?.filter(inv => inv.status === 'sent').length || 0,
            overdue: invoices?.filter(inv => inv.status === 'overdue').length || 0
          }
        };

        return new Response(
          JSON.stringify({ success: true, data: summary }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        );
      }

      case 'generate_financial_report': {
        const {
          report_type,
          start_date,
          end_date,
          include_charts = true,
          format = 'json'
        } = requestData;

        // For now, return a basic report structure
        // This can be expanded to generate actual PDFs or CSVs
        const report = {
          report_type,
          period: {
            start_date,
            end_date
          },
          generated_at: new Date().toISOString(),
          format,
          data: {
            summary: 'Financial report data would be generated here',
            charts_included: include_charts
          }
        };

        return new Response(
          JSON.stringify({ success: true, data: report }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        );
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Unknown action' }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        );
    }

  } catch (error) {
    console.error('Finance API Error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
