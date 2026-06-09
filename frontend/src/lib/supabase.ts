/**
 * MOCK SUPABASE CLIENT
 * 
 * This file replaces the real Supabase client to prevent build errors
 * during the migration to Laravel API.
 * 
 * Any feature attempting to use this client will receive errors or empty data.
 * Please migrate the feature to use 'api.ts' and the Laravel backend.
 */

// Basic mock to satisfy TypeScript and runtime calls
const mockPromise = async () => ({
    data: null,
    error: { message: "Supabase has been removed. Please migrate to Laravel API." }
});

const mockChain = {
    select: () => mockChain,
    insert: () => mockChain,
    update: () => mockChain,
    upsert: () => mockChain,
    delete: () => mockChain,
    eq: () => mockChain,
    neq: () => mockChain,
    gt: () => mockChain,
    lt: () => mockChain,
    gte: () => mockChain,
    lte: () => mockChain,
    in: () => mockChain,
    contains: () => mockChain,
    order: () => mockChain,
    limit: () => mockChain,
    single: mockPromise,
    maybeSingle: mockPromise,
    then: (resolve: any) => Promise.resolve({ data: [], error: { message: "Supabase removed" } }).then(resolve)
};

export const supabase = {
    auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
        signInWithPassword: mockPromise,
        signOut: async () => ({ error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
        signUp: mockPromise,
    },
    from: (table: string) => {
        console.warn(`[Supabase Mock] Accessing table '${table}'. Feature likely broken.`);
        return mockChain;
    },
    storage: {
        from: () => ({
            upload: mockPromise,
            download: mockPromise,
            list: mockPromise,
            getPublicUrl: () => ({ data: { publicUrl: "" } }),
        })
    },
    channel: () => ({
        on: () => ({
            subscribe: () => { }
        })
    })
};
