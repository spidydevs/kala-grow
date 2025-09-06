Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Credentials': 'false'
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        // Get environment variables
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!serviceRoleKey || !supabaseUrl) {
            throw new Error('Supabase configuration missing');
        }

        // Get user from auth header
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            throw new Error('Authorization header required');
        }

        const token = authHeader.replace('Bearer ', '');
        const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'apikey': serviceRoleKey
            }
        });

        if (!userResponse.ok) {
            throw new Error('Invalid authentication token');
        }

        const userData = await userResponse.json();
        const userId = userData.id;

        // Parse request data
        let requestData: any = {};
        try {
            requestData = await req.json();
        } catch {
            requestData = {};
        }

        const { invoice_id, format = 'pdf' } = requestData;

        if (!invoice_id) {
            return new Response(
                JSON.stringify({ success: false, error: 'Invoice ID is required' }),
                { 
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 400 
                }
            );
        }

        // Get invoice data (updated to match actual database structure)
        const invoiceResponse = await fetch(
            `${supabaseUrl}/rest/v1/invoices?id=eq.${invoice_id}&user_id=eq.${userId}&select=*`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                }
            }
        );

        if (!invoiceResponse.ok) {
            return new Response(
                JSON.stringify({ success: false, error: 'Invoice not found' }),
                { 
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 404 
                }
            );
        }

        const invoices = await invoiceResponse.json();
        if (!invoices || invoices.length === 0) {
            return new Response(
                JSON.stringify({ success: false, error: 'Invoice not found or access denied' }),
                { 
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 404 
                }
            );
        }

        const invoice = invoices[0];
        
        // Extract client info from invoice data (since client data is stored directly in invoice)
        const clientInfo = {
            name: invoice.client_name,
            email: invoice.client_email,
            company: invoice.client_company,
            address: invoice.client_address // Note: this may not exist in current schema
        };

        if (format === 'html') {
            // Generate HTML invoice
            const html = generateInvoiceHTML(invoice, clientInfo);
            
            return new Response(
                JSON.stringify({ 
                    success: true, 
                    data: { 
                        format: 'html',
                        content: html,
                        invoice_id 
                    } 
                }),
                { 
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200 
                }
            );
        } else {
            // Generate downloadable invoice content
            const html = generateInvoiceHTML(invoice, clientInfo);
            
            return new Response(
                JSON.stringify({ 
                    success: true, 
                    data: { 
                        format: 'html', // For now, return HTML that can be printed as PDF
                        content: html,
                        filename: `invoice-${invoice.invoice_number}.html`,
                        invoice_id,
                        contentType: 'text/html'
                    } 
                }),
                { 
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200 
                }
            );
        }

    } catch (error) {
        console.error('Export Invoice Error:', error);
        
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

function generateInvoiceHTML(invoice: any, client: any): string {
    // Parse line items if they exist
    let lineItems = [];
    try {
        lineItems = invoice.line_items ? JSON.parse(invoice.line_items) : [];
    } catch (e) {
        lineItems = [];
    }
    
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Invoice #${invoice.invoice_number}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; }
                .header { text-align: center; margin-bottom: 30px; }
                .invoice-info { margin-bottom: 30px; }
                .client-info { margin-bottom: 30px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { padding: 10px; border-bottom: 1px solid #ddd; }
                th { background-color: #f5f5f5; }
                .totals { margin-top: 20px; text-align: right; }
                .total { font-weight: bold; font-size: 18px; }
                @media print { body { margin: 20px; } }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>INVOICE</h1>
                <h2>#${invoice.invoice_number}</h2>
            </div>
            
            <div class="invoice-info">
                <p><strong>Issue Date:</strong> ${invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString() : new Date(invoice.created_at).toLocaleDateString()}</p>
                <p><strong>Due Date:</strong> ${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A'}</p>
                <p><strong>Status:</strong> ${invoice.status?.toUpperCase() || 'DRAFT'}</p>
            </div>
            
            <div class="client-info">
                <h3>Bill To:</h3>
                <p><strong>${client?.name || 'N/A'}</strong></p>
                ${client?.company ? `<p>${client.company}</p>` : ''}
                ${client?.email ? `<p>Email: ${client.email}</p>` : ''}
                ${client?.address ? `<p>${client.address}</p>` : ''}
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>Description</th>
                        <th style="text-align: center;">Qty</th>
                        <th style="text-align: right;">Unit Price</th>
                        <th style="text-align: right;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${lineItems.length > 0 ? 
                        lineItems.map((item: any) => `
                            <tr>
                                <td>${item.description || 'Service'}</td>
                                <td style="text-align: center;">${item.quantity || 1}</td>
                                <td style="text-align: right;">$${(item.unit_price || 0).toFixed(2)}</td>
                                <td style="text-align: right;">$${(item.line_total || 0).toFixed(2)}</td>
                            </tr>
                        `).join('') : 
                        `<tr>
                            <td>${invoice.description || 'Service Provided'}</td>
                            <td style="text-align: center;">1</td>
                            <td style="text-align: right;">$${(invoice.amount || 0).toFixed(2)}</td>
                            <td style="text-align: right;">$${(invoice.amount || 0).toFixed(2)}</td>
                        </tr>`
                    }
                </tbody>
            </table>
            
            <div class="totals">
                <p>Subtotal: $${(invoice.amount || 0).toFixed(2)}</p>
                ${(invoice.tax_rate && invoice.tax_rate > 0) ? `<p>Tax (${(invoice.tax_rate * 100).toFixed(1)}%): $${(invoice.tax_amount || 0).toFixed(2)}</p>` : ''}
                <p class="total">Total: $${(invoice.total_amount || 0).toFixed(2)}</p>
            </div>
            
            ${invoice.notes ? `<div style="margin-top: 30px;"><h3>Notes:</h3><p style="white-space: pre-line;">${invoice.notes}</p></div>` : ''}
            
            <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #666;">
                <p>Thank you for your business!</p>
            </div>
        </body>
        </html>
    `;
}

