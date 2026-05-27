"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth-store";
import {
  tablesDB,
  storage,
  DATABASE_ID,
  PRODUCTS_TABLE_ID,
  PRODUCT_IMAGES_TABLE_ID,
  STORAGE_BUCKET_ID,
} from "@/lib/appwrite";
import { Product, ProductImage } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Edit,
  Trash2,
  Image as ImageIcon,
  Images,
  Search,
  Filter,
  Grid3x3,
  List,
  Download,
  Upload,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Package,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { ID, Query } from "appwrite";
import toast from "react-hot-toast";
import Image from "next/image";
import AdminAuthGuard from "@/components/admin/AdminAuthGuard";
import ReadOnlyGuard from "@/components/admin/ReadOnlyGuard";
import { AdminPermission } from "@/lib/store/auth-store";
import { clearImageCache } from "@/lib/actions/cache-actions";

export default function AdminProductsPage() {
  const router = useRouter();
  const { hasReadPermission, hasWritePermission } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "available" | "unavailable"
  >("all");
  const [sortBy, setSortBy] = useState<"name" | "price" | "date">("date");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    base_price_per_kg: 0,
    has_tier_pricing: false,
    tier_2_4kg_price: 0,
    tier_5_9kg_price: 0,
    tier_10kg_up_price: 0,
    available: true,
  });

  // No need for checkAuth or redirect logic - AdminAuthGuard handles this

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    let filtered = [...products];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.description &&
            p.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Apply status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter((p) =>
        filterStatus === "available" ? p.available : !p.available
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      } else if (sortBy === "price") {
        return b.base_price_per_kg - a.base_price_per_kg;
      } else {
        return (
          new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime()
        );
      }
    });

    setFilteredProducts(filtered);
  }, [products, searchQuery, filterStatus, sortBy]);

  const fetchProducts = async () => {
    try {
      const response = await tablesDB.listRows({ databaseId: DATABASE_ID, tableId: PRODUCTS_TABLE_ID, queries: [Query.orderDesc("$createdAt")] });
      const productsList = response.rows as unknown as Product[];
      setProducts(productsList);
      setFilteredProducts(productsList);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const roundPrice = (price: number): number => {
    // Return the price as-is without forcing decimal places
    return Math.round(price);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const productData = {
        name: formData.name,
        description: formData.description || null,
        base_price_per_kg: roundPrice(formData.base_price_per_kg),
        has_tier_pricing: formData.has_tier_pricing,
        tier_2_4kg_price:
          formData.has_tier_pricing && formData.tier_2_4kg_price
            ? roundPrice(formData.tier_2_4kg_price)
            : null,
        tier_5_9kg_price:
          formData.has_tier_pricing && formData.tier_5_9kg_price
            ? roundPrice(formData.tier_5_9kg_price)
            : null,
        tier_10kg_up_price:
          formData.has_tier_pricing && formData.tier_10kg_up_price
            ? roundPrice(formData.tier_10kg_up_price)
            : null,
        available: formData.available,
      };

      if (editingId) {
        await tablesDB.updateRow({ databaseId: DATABASE_ID, tableId: PRODUCTS_TABLE_ID, rowId: editingId, data: productData });
        toast.success("Product updated successfully!");
      } else {
        const productId = ID.unique();
        await tablesDB.createRow({ databaseId: DATABASE_ID, tableId: PRODUCTS_TABLE_ID, rowId: productId, data: productData });
        toast.success(
          "Product created! Now add images by clicking the 📸 icon."
        );
      }

      resetForm();
      fetchProducts();
      // Clear cache so frontend shows updated availability
      await clearImageCache();
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error("Failed to save product");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingId(product.$id);
    setFormData({
      name: product.name,
      description: product.description || "",
      base_price_per_kg: product.base_price_per_kg,
      has_tier_pricing: product.has_tier_pricing,
      tier_2_4kg_price: product.tier_2_4kg_price || 0,
      tier_5_9kg_price: product.tier_5_9kg_price || 0,
      tier_10kg_up_price: product.tier_10kg_up_price || 0,
      available: product.available,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      await tablesDB.deleteRow({ databaseId: DATABASE_ID, tableId: PRODUCTS_TABLE_ID, rowId: id });
      toast.success("Product deleted successfully!");
      fetchProducts();
      // Clear cache so frontend reflects the deletion
      await clearImageCache();
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Failed to delete product");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0) {
      toast.error("No products selected");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to delete ${selectedProducts.length} product(s)?`
      )
    )
      return;

    try {
      await Promise.all(
        selectedProducts.map((id) =>
          tablesDB.deleteRow({ databaseId: DATABASE_ID, tableId: PRODUCTS_TABLE_ID, rowId: id })
        )
      );
      toast.success(
        `${selectedProducts.length} product(s) deleted successfully!`
      );
      setSelectedProducts([]);
      fetchProducts();
    } catch (error) {
      console.error("Error deleting products:", error);
      toast.error("Failed to delete products");
    }
  };

  const handleBulkToggleAvailability = async (available: boolean) => {
    if (selectedProducts.length === 0) {
      toast.error("No products selected");
      return;
    }

    try {
      await Promise.all(
        selectedProducts.map((id) =>
          tablesDB.updateRow({ databaseId: DATABASE_ID, tableId: PRODUCTS_TABLE_ID, rowId: id, data: {
                            available,
                          } })
        )
      );
      toast.success(
        `${selectedProducts.length} product(s) updated successfully!`
      );
      setSelectedProducts([]);
      fetchProducts();
    } catch (error) {
      console.error("Error updating products:", error);
      toast.error("Failed to update products");
    }
  };

  const toggleProductSelection = (id: string) => {
    setSelectedProducts((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const toggleAllProducts = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map((p) => p.$id));
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      base_price_per_kg: 0,
      has_tier_pricing: false,
      tier_2_4kg_price: 0,
      tier_5_9kg_price: 0,
      tier_10kg_up_price: 0,
      available: true,
    });
    setEditingId(null);
    setShowForm(false);
  };

  // AdminAuthGuard handles authentication and access control

  const stats = {
    total: products.length,
    available: products.filter((p) => p.available).length,
    unavailable: products.filter((p) => !p.available).length,
    avgPrice:
      products.length > 0
        ? products.reduce((sum, p) => sum + p.base_price_per_kg, 0) /
        products.length
        : 0,
  };

  return (
    <AdminAuthGuard requiredPermission={AdminPermission.FULL_ACCESS}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Product Management
              </h1>
              <p className="text-lg text-gray-600 flex items-center gap-2">
                <Package className="w-5 h-5" />
                Advanced inventory and catalog management
              </p>
            </div>
            <ReadOnlyGuard>
              <Button onClick={() => setShowForm(!showForm)} size="lg">
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Button>
            </ReadOnlyGuard>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Products</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.total}
                    </p>
                  </div>
                  <Package className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Available</p>
                    <p className="text-2xl font-bold text-green-600">
                      {stats.available}
                    </p>
                  </div>
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Unavailable</p>
                    <p className="text-2xl font-bold text-red-600">
                      {stats.unavailable}
                    </p>
                  </div>
                  <XCircle className="w-8 h-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Avg Price</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(stats.avgPrice)}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search products by name or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select
                  value={filterStatus}
                  onValueChange={(value: any) => setFilterStatus(value)}
                >
                  <SelectTrigger className="w-full md:w-48">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Products</SelectItem>
                    <SelectItem value="available">Available Only</SelectItem>
                    <SelectItem value="unavailable">
                      Unavailable Only
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={sortBy}
                  onValueChange={(value: any) => setSortBy(value)}
                >
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Sort by Date</SelectItem>
                    <SelectItem value="name">Sort by Name</SelectItem>
                    <SelectItem value="price">Sort by Price</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === "grid" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                  >
                    <Grid3x3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === "table" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("table")}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bulk Actions */}
          {selectedProducts.length > 0 && (
            <Card className="mb-6 border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-blue-900">
                    {selectedProducts.length} product(s) selected
                  </p>
                  <div className="flex gap-2">
                    <ReadOnlyGuard>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBulkToggleAvailability(true)}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Mark Available
                      </Button>
                    </ReadOnlyGuard>
                    <ReadOnlyGuard>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBulkToggleAvailability(false)}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Mark Unavailable
                      </Button>
                    </ReadOnlyGuard>
                    <ReadOnlyGuard>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleBulkDelete}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Selected
                      </Button>
                    </ReadOnlyGuard>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {showForm && (
          <Card className="mb-8">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold mb-4">
                {editingId ? "Edit Product" : "Add New Product"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Product Name *"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    rows={3}
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>

                <Input
                  label="Base Price per KG (Rs.) *"
                  type="number"
                  step="1"
                  value={formData.base_price_per_kg || ""}
                  onChange={(e) => {
                    const value =
                      e.target.value === "" ? 0 : Number(e.target.value);
                    setFormData({ ...formData, base_price_per_kg: value });
                  }}
                  required
                />

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="has_tier_pricing"
                    checked={formData.has_tier_pricing}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        has_tier_pricing: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                  />
                  <label
                    htmlFor="has_tier_pricing"
                    className="text-sm font-medium text-gray-700"
                  >
                    Enable Tier Pricing
                  </label>
                </div>

                {formData.has_tier_pricing && (
                  <div className="grid md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                    <Input
                      label="2-4 kg Price (Rs.) - Optional"
                      type="number"
                      step="1"
                      value={formData.tier_2_4kg_price || ""}
                      onChange={(e) => {
                        const value =
                          e.target.value === "" ? 0 : Number(e.target.value);
                        setFormData({ ...formData, tier_2_4kg_price: value });
                      }}
                    />
                    <Input
                      label="5-9 kg Price (Rs.)"
                      type="number"
                      step="1"
                      value={formData.tier_5_9kg_price || ""}
                      onChange={(e) => {
                        const value =
                          e.target.value === "" ? 0 : Number(e.target.value);
                        setFormData({ ...formData, tier_5_9kg_price: value });
                      }}
                    />
                    <Input
                      label="10+ kg Price (Rs.)"
                      type="number"
                      step="1"
                      value={formData.tier_10kg_up_price || ""}
                      onChange={(e) => {
                        const value =
                          e.target.value === "" ? 0 : Number(e.target.value);
                        setFormData({ ...formData, tier_10kg_up_price: value });
                      }}
                    />
                  </div>
                )}

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>📸 Note:</strong> After creating the product, click
                    the <Images className="w-4 h-4 inline text-blue-600" /> icon
                    to manage product images.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="available"
                    checked={formData.available}
                    onChange={(e) =>
                      setFormData({ ...formData, available: e.target.checked })
                    }
                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                  />
                  <label
                    htmlFor="available"
                    className="text-sm font-medium text-gray-700"
                  >
                    Available for Purchase
                  </label>
                </div>

                <div className="flex space-x-3">
                  <Button type="submit" disabled={loading}>
                    {loading
                      ? "Saving..."
                      : editingId
                        ? "Update Product"
                        : "Create Product"}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Products Display */}
        {viewMode === "grid" ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <Card
                key={product.$id}
                className="hover:shadow-lg transition-shadow"
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(product.$id)}
                        onChange={() => toggleProductSelection(product.$id)}
                        className="mt-1 w-4 h-4 text-green-600 rounded focus:ring-green-500"
                      />
                      <h3 className="text-lg font-semibold">{product.name}</h3>
                    </div>
                    <div className="flex space-x-1">
                      <Link href={`/admin/products/${product.$id}/images`}>
                        <Button size="sm" variant="ghost" title="Manage Images">
                          <Images className="w-4 h-4 text-blue-600" />
                        </Button>
                      </Link>
                      <ReadOnlyGuard>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(product)}
                          title="Edit Product"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </ReadOnlyGuard>
                      <ReadOnlyGuard>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(product.$id)}
                          title="Delete Product"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </ReadOnlyGuard>
                    </div>
                  </div>

                  {product.description && (
                    <p className="text-sm text-gray-600 mb-3">
                      {product.description}
                    </p>
                  )}

                  <div className="space-y-1 mb-3">
                    <p className="text-sm">
                      <span className="font-medium">Base Price:</span>{" "}
                      {formatCurrency(product.base_price_per_kg)}/kg
                    </p>
                    {product.has_tier_pricing && (
                      <>
                        {product.tier_2_4kg_price && (
                          <p className="text-xs text-gray-600">
                            2-4kg: {formatCurrency(product.tier_2_4kg_price)}/kg
                          </p>
                        )}
                        {product.tier_5_9kg_price && (
                          <p className="text-xs text-gray-600">
                            5-9kg: {formatCurrency(product.tier_5_9kg_price)}/kg
                          </p>
                        )}
                        {product.tier_10kg_up_price && (
                          <p className="text-xs text-gray-600">
                            10+kg: {formatCurrency(product.tier_10kg_up_price)}
                            /kg
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <Badge
                      variant={product.available ? "success" : "destructive"}
                    >
                      {product.available ? "Available" : "Unavailable"}
                    </Badge>
                    {product.has_tier_pricing && (
                      <Badge variant="purple">Tier Pricing</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={
                          selectedProducts.length === filteredProducts.length &&
                          filteredProducts.length > 0
                        }
                        onChange={toggleAllProducts}
                        className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                      />
                    </TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Base Price</TableHead>
                    <TableHead>Tier Pricing</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.$id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedProducts.includes(product.$id)}
                          onChange={() => toggleProductSelection(product.$id)}
                          className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          {product.description && (
                            <p className="text-xs text-gray-500 truncate max-w-xs">
                              {product.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(product.base_price_per_kg)}/kg
                      </TableCell>
                      <TableCell>
                        {product.has_tier_pricing ? (
                          <Badge variant="purple">Enabled</Badge>
                        ) : (
                          <span className="text-gray-400 text-sm">No</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            product.available ? "success" : "destructive"
                          }
                        >
                          {product.available ? "Available" : "Unavailable"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(product.$createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Link href={`/admin/products/${product.$id}/images`}>
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Manage Images"
                            >
                              <Images className="w-4 h-4 text-blue-600" />
                            </Button>
                          </Link>
                          <ReadOnlyGuard>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(product)}
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </ReadOnlyGuard>
                          <ReadOnlyGuard>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(product.$id)}
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </ReadOnlyGuard>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {filteredProducts.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No products found</p>
              <p className="text-gray-400 text-sm mt-2">
                Try adjusting your search or filters
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminAuthGuard>
  );
}
