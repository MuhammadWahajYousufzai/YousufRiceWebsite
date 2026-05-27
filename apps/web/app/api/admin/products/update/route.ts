import { NextRequest, NextResponse } from 'next/server';
import { tablesDB, DATABASE_ID, PRODUCTS_TABLE_ID } from "@/lib/appwrite";
import { checkAdminPermissions, withAdminAuth } from '@/lib/auth-utils';

/**
 * API route to update a product
 * Protected by admin auth utility (requires write access)
 */
export async function PUT(req: NextRequest) {
  // Check admin permissions (write access required for PUT)
  const authError = await checkAdminPermissions(req, true);
  if (authError) {
    return authError;
  }
  
  try {
    const data = await req.json();
    const { id, ...updateData } = data;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }
    
    // Update the product in the database
    const updatedProduct = await tablesDB.updateRow({ databaseId: DATABASE_ID, tableId: PRODUCTS_TABLE_ID, rowId: id, data: updateData });
    
    // Revalidate products cache
    const { updateTag } = await import('next/cache');
    updateTag('products');
    
    return NextResponse.json({
      success: true,
      message: 'Product updated successfully',
      product: updatedProduct
    });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

/**
 * API route to delete a product
 * Protected by admin auth utility (requires write access)
 */
export async function DELETE(req: NextRequest) {
  // Check admin permissions (write access required for DELETE)
  const authError = await checkAdminPermissions(req, true);
  if (authError) {
    return authError;
  }
  
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }
    
    // Delete the product from the database
    await tablesDB.deleteRow({ databaseId: DATABASE_ID, tableId: PRODUCTS_TABLE_ID, rowId: id });
    
    // Revalidate products cache
    const { updateTag } = await import('next/cache');
    updateTag('products');
    
    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}
