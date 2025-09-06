import { supabase } from './supabase';

// Database proxy utility that uses Edge Function instead of direct PostgREST
export class DatabaseProxy {
    private static async callProxy(operation: string, params: any) {
        try {
            const { data, error } = await supabase.functions.invoke('database-proxy', {
                body: {
                    operation,
                    ...params
                }
            });

            if (error) {
                console.error('Database proxy error:', error);
                throw new Error(error.message || 'Database proxy failed');
            }

            return { data: data?.data || data, error: null };
        } catch (err) {
            console.error('Database proxy call failed:', err);
            return { 
                data: null, 
                error: { 
                    message: err instanceof Error ? err.message : 'Unknown error',
                    code: 'DATABASE_PROXY_ERROR'
                }
            };
        }
    }

    // SELECT operations
    static async select(table: string, options: {
        select?: string;
        filters?: Record<string, any>;
        orderBy?: string;
        limit?: number;
    } = {}) {
        return this.callProxy('select', {
            table,
            select: options.select || '*',
            filters: options.filters || {},
            orderBy: options.orderBy || '',
            limit: options.limit || 0
        });
    }

    // INSERT operations
    static async insert(table: string, data: any) {
        return this.callProxy('insert', {
            table,
            data
        });
    }

    // UPDATE operations
    static async update(table: string, data: any, filters: Record<string, any>) {
        return this.callProxy('update', {
            table,
            data,
            filters
        });
    }

    // DELETE operations
    static async delete(table: string, filters: Record<string, any>) {
        return this.callProxy('delete', {
            table,
            filters
        });
    }

    // Custom queries
    static async customQuery(queryType: string, params: any = {}) {
        return this.callProxy('custom', {
            queryType,
            params
        });
    }

    // Specific method for productivity analytics
    static async getProductivityAnalytics() {
        return this.customQuery('productivity_analytics');
    }

    // Specific method for user profile with tasks
    static async getUserProfileWithTasks(userId?: string) {
        return this.customQuery('user_profile_with_tasks', { userId });
    }

    // Convenience methods that mimic Supabase client API
    static from(table: string) {
        return {
            select: (columns: string = '*') => ({
                eq: (column: string, value: any) => this.select(table, {
                    select: columns,
                    filters: { [column]: value }
                }),
                order: (column: string, options?: { ascending?: boolean }) => {
                    const orderBy = options?.ascending === false ? `${column}.desc` : `${column}.asc`;
                    return this.select(table, {
                        select: columns,
                        orderBy
                    });
                },
                limit: (count: number) => this.select(table, {
                    select: columns,
                    limit: count
                }),
                // For chaining
                then: (resolve: any, reject: any) => {
                    return this.select(table, { select: columns }).then(resolve, reject);
                }
            }),
            insert: (data: any) => ({
                select: () => this.insert(table, data),
                then: (resolve: any, reject: any) => {
                    return this.insert(table, data).then(resolve, reject);
                }
            }),
            update: (data: any) => ({
                eq: (column: string, value: any) => this.update(table, data, { [column]: value }),
                then: (resolve: any, reject: any) => {
                    // Note: This requires filters to be set via eq() first
                    return Promise.reject(new Error('Must specify filters using .eq() before update'));
                }
            }),
            delete: () => ({
                eq: (column: string, value: any) => this.delete(table, { [column]: value }),
                then: (resolve: any, reject: any) => {
                    return Promise.reject(new Error('Must specify filters using .eq() before delete'));
                }
            })
        };
    }
}

// Export a default instance that can be used as a drop-in replacement for supabase
export const proxyDB = {
    from: (table: string) => DatabaseProxy.from(table),
    
    // Direct method access
    select: DatabaseProxy.select.bind(DatabaseProxy),
    insert: DatabaseProxy.insert.bind(DatabaseProxy),
    update: DatabaseProxy.update.bind(DatabaseProxy),
    delete: DatabaseProxy.delete.bind(DatabaseProxy),
    customQuery: DatabaseProxy.customQuery.bind(DatabaseProxy),
    getProductivityAnalytics: DatabaseProxy.getProductivityAnalytics.bind(DatabaseProxy),
    getUserProfileWithTasks: DatabaseProxy.getUserProfileWithTasks.bind(DatabaseProxy)
};

export default proxyDB;