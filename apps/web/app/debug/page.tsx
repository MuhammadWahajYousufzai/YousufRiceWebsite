import { getCachedProducts } from '@/lib/cached-data';

export default async function DebugPage() {
    const products = await getCachedProducts();

    return (
        <div className="p-10">
            <h1 className="text-2xl font-bold mb-4">Product Debug</h1>
            <table className="min-w-full border">
                <thead>
                    <tr>
                        <th className="border p-2">ID</th>
                        <th className="border p-2">Name</th>
                    </tr>
                </thead>
                <tbody>
                    {products.map(p => (
                        <tr key={p.$id}>
                            <td className="border p-2 font-mono">{p.$id}</td>
                            <td className="border p-2">{p.name}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
