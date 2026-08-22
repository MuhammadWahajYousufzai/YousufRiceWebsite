"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  Product,
  ProductImage,
  StorefrontContent,
  StorefrontTheme,
  StorefrontVisualStyle,
} from "@repo/types";
import { ID, Query } from "appwrite";
import {
  CalendarClock,
  Eye,
  EyeOff,
  GripVertical,
  Megaphone,
  Pencil,
  Plus,
  Radio,
  Save,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import AdminAuthGuard from "@/components/admin/AdminAuthGuard";
import ReadOnlyGuard from "@/components/admin/ReadOnlyGuard";
import { PromotionCard } from "@/components/storefront-promotions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DATABASE_ID,
  PRODUCT_IMAGES_TABLE_ID,
  PRODUCTS_TABLE_ID,
  STOREFRONT_CONTENT_TABLE_ID,
  tablesDB,
} from "@/lib/appwrite";
import { AdminPermission } from "@/lib/store/auth-store";

const themes: Array<{ value: StorefrontTheme; label: string }> = [
  { value: "harvest", label: "Harvest brown" },
  { value: "midnight", label: "Yousuf blue" },
  { value: "saffron", label: "Saffron gold" },
  { value: "emerald", label: "Fresh green" },
  { value: "rose", label: "Rose red" },
];

const layouts: Array<{ value: StorefrontVisualStyle; label: string }> = [
  { value: "product_focus", label: "Product focus" },
  { value: "split", label: "Balanced split" },
  { value: "minimal", label: "Text only" },
];

interface PromotionForm {
  id: string | null;
  badgeText: string;
  ctaText: string;
  ctaUrl: string;
  description: string;
  enabled: boolean;
  endsAt: string;
  productId: string;
  qualifyingBagSizeKg: string;
  rewardQuantity: string;
  rewardText: string;
  showOnMobile: boolean;
  showOnWeb: boolean;
  showProductPrice: boolean;
  sortOrder: string;
  startsAt: string;
  theme: StorefrontTheme;
  title: string;
  visualStyle: StorefrontVisualStyle;
}

interface AnnouncementForm {
  ctaText: string;
  ctaUrl: string;
  enabled: boolean;
  showOnMobile: boolean;
  showOnWeb: boolean;
  theme: StorefrontTheme;
  title: string;
}

const emptyPromotion: PromotionForm = {
  id: null,
  badgeText: "Current offer",
  ctaText: "View offer",
  ctaUrl: "",
  description: "",
  enabled: true,
  endsAt: "",
  productId: "",
  qualifyingBagSizeKg: "",
  rewardQuantity: "1",
  rewardText: "",
  showOnMobile: true,
  showOnWeb: true,
  showProductPrice: true,
  sortOrder: "10",
  startsAt: "",
  theme: "saffron",
  title: "",
  visualStyle: "product_focus",
};

const emptyAnnouncement: AnnouncementForm = {
  ctaText: "Shop now",
  ctaUrl: "/#products",
  enabled: false,
  showOnMobile: true,
  showOnWeb: true,
  theme: "midnight",
  title: "",
};

function rowsFromResponse<T>(response: { rows?: unknown[]; documents?: unknown[] }) {
  return (response.rows ?? response.documents ?? []) as T[];
}

function toLocalDateTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function optionalNumber(value: string) {
  const parsed = Number(value);
  return value.trim() && Number.isFinite(parsed) ? parsed : null;
}

export default function AdminPromotionsPage() {
  const [contents, setContents] = useState<StorefrontContent[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [form, setForm] = useState<PromotionForm>(emptyPromotion);
  const [announcementForm, setAnnouncementForm] =
    useState<AnnouncementForm>(emptyAnnouncement);

  const load = useCallback(async () => {
    try {
      const [contentResponse, productResponse, imageResponse] = await Promise.all([
        tablesDB.listRows({
          databaseId: DATABASE_ID,
          tableId: STOREFRONT_CONTENT_TABLE_ID,
          queries: [Query.limit(100)],
        }),
        tablesDB.listRows({
          databaseId: DATABASE_ID,
          tableId: PRODUCTS_TABLE_ID,
          queries: [Query.limit(100)],
        }),
        tablesDB.listRows({
          databaseId: DATABASE_ID,
          tableId: PRODUCT_IMAGES_TABLE_ID,
          queries: [Query.limit(200)],
        }),
      ]);
      const nextContents = rowsFromResponse<StorefrontContent>(contentResponse);
      setContents(nextContents);
      setProducts(rowsFromResponse<Product>(productResponse));
      setImages(rowsFromResponse<ProductImage>(imageResponse));

      const announcement = nextContents.find(
        (content) => content.placement === "announcement",
      );
      setAnnouncementForm(
        announcement
          ? {
              ctaText: announcement.cta_text || "",
              ctaUrl: announcement.cta_url || "",
              enabled: announcement.enabled,
              showOnMobile: announcement.show_on_mobile,
              showOnWeb: announcement.show_on_web,
              theme: announcement.theme,
              title: announcement.title,
            }
          : emptyAnnouncement,
      );
    } catch (error) {
      console.error("Could not load promotions:", error);
      toast.error("Could not load promotions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // This is the page's initial Appwrite synchronization.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const promotions = useMemo(
    () =>
      contents
        .filter((content) => content.placement === "promotion")
        .sort((a, b) => a.sort_order - b.sort_order),
    [contents],
  );

  const imageFileIds = useMemo(() => {
    const map = new Map<string, string>();
    for (const image of images) {
      if (image.is_cold_drink_bundle) continue;
      if (image.is_primary || !map.has(image.product_id)) {
        map.set(image.product_id, image.file_id);
      }
    }
    return map;
  }, [images]);

  const selectedProduct = products.find((product) => product.$id === form.productId);
  const previewPromotion: StorefrontContent = {
    $id: form.id || "preview",
    $createdAt: new Date().toISOString(),
    $updatedAt: new Date().toISOString(),
    placement: "promotion",
    enabled: form.enabled,
    title: form.title || "Your offer title",
    description: form.description || "Explain the offer in one clear sentence.",
    badge_text: form.badgeText,
    cta_text: form.ctaText,
    cta_url: form.ctaUrl,
    product_id: form.productId || undefined,
    theme: form.theme,
    visual_style: form.visualStyle,
    sort_order: Number(form.sortOrder) || 0,
    show_on_web: form.showOnWeb,
    show_on_mobile: form.showOnMobile,
    show_product_price: form.showProductPrice,
    qualifying_bag_size_kg: optionalNumber(form.qualifyingBagSizeKg) || undefined,
    reward_text: form.rewardText || undefined,
    reward_quantity: optionalNumber(form.rewardQuantity) || undefined,
    starts_at: form.startsAt || undefined,
    ends_at: form.endsAt || undefined,
  };

  const editPromotion = (promotion: StorefrontContent) => {
    setForm({
      id: promotion.$id,
      badgeText: promotion.badge_text || "",
      ctaText: promotion.cta_text || "",
      ctaUrl: promotion.cta_url || "",
      description: promotion.description || "",
      enabled: promotion.enabled,
      endsAt: toLocalDateTime(promotion.ends_at),
      productId: promotion.product_id || "",
      qualifyingBagSizeKg: promotion.qualifying_bag_size_kg?.toString() || "",
      rewardQuantity: promotion.reward_quantity?.toString() || "1",
      rewardText: promotion.reward_text || "",
      showOnMobile: promotion.show_on_mobile,
      showOnWeb: promotion.show_on_web,
      showProductPrice: promotion.show_product_price,
      sortOrder: promotion.sort_order.toString(),
      startsAt: toLocalDateTime(promotion.starts_at),
      theme: promotion.theme,
      title: promotion.title,
      visualStyle: promotion.visual_style,
    });
    setShowEditor(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetEditor = () => {
    setForm({
      ...emptyPromotion,
      sortOrder: String((promotions.at(-1)?.sort_order ?? 0) + 10),
    });
    setShowEditor(false);
  };

  const savePromotion = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim()) {
      toast.error("Write an offer title");
      return;
    }
    setSaving(true);
    const data = {
      placement: "promotion",
      enabled: form.enabled,
      title: form.title.trim(),
      description: form.description.trim() || null,
      badge_text: form.badgeText.trim() || null,
      cta_text: form.ctaText.trim() || null,
      cta_url: form.ctaUrl.trim() || null,
      product_id: form.productId || null,
      theme: form.theme,
      visual_style: form.visualStyle,
      sort_order: Math.max(0, Number(form.sortOrder) || 0),
      show_on_web: form.showOnWeb,
      show_on_mobile: form.showOnMobile,
      show_product_price: form.showProductPrice,
      qualifying_bag_size_kg: optionalNumber(form.qualifyingBagSizeKg),
      reward_text: form.rewardText.trim() || null,
      reward_quantity: form.rewardText.trim()
        ? Math.max(1, optionalNumber(form.rewardQuantity) || 1)
        : null,
      starts_at: form.startsAt ? new Date(form.startsAt).toISOString() : null,
      ends_at: form.endsAt ? new Date(form.endsAt).toISOString() : null,
    };

    try {
      if (form.id) {
        await tablesDB.updateRow({
          databaseId: DATABASE_ID,
          tableId: STOREFRONT_CONTENT_TABLE_ID,
          rowId: form.id,
          data,
        });
        toast.success("Promotion updated everywhere");
      } else {
        await tablesDB.createRow({
          databaseId: DATABASE_ID,
          tableId: STOREFRONT_CONTENT_TABLE_ID,
          rowId: ID.unique(),
          data,
        });
        toast.success("Promotion published everywhere");
      }
      resetEditor();
      await load();
    } catch (error) {
      console.error("Could not save promotion:", error);
      toast.error("Could not save promotion");
    } finally {
      setSaving(false);
    }
  };

  const togglePromotion = async (promotion: StorefrontContent) => {
    try {
      await tablesDB.updateRow({
        databaseId: DATABASE_ID,
        tableId: STOREFRONT_CONTENT_TABLE_ID,
        rowId: promotion.$id,
        data: { enabled: !promotion.enabled },
      });
      toast.success(promotion.enabled ? "Promotion switched off" : "Promotion switched on");
      await load();
    } catch (error) {
      console.error("Could not toggle promotion:", error);
      toast.error("Could not change promotion status");
    }
  };

  const deletePromotion = async (promotion: StorefrontContent) => {
    if (!window.confirm(`Delete “${promotion.title}”?`)) return;
    try {
      await tablesDB.deleteRow({
        databaseId: DATABASE_ID,
        tableId: STOREFRONT_CONTENT_TABLE_ID,
        rowId: promotion.$id,
      });
      toast.success("Promotion deleted");
      await load();
    } catch (error) {
      console.error("Could not delete promotion:", error);
      toast.error("Could not delete promotion");
    }
  };

  const saveAnnouncement = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!announcementForm.title.trim()) {
      toast.error("Write the announcement text");
      return;
    }
    setSaving(true);
    const current = contents.find((content) => content.placement === "announcement");
    const data = {
      placement: "announcement",
      enabled: announcementForm.enabled,
      title: announcementForm.title.trim(),
      description: null,
      badge_text: null,
      cta_text: announcementForm.ctaText.trim() || null,
      cta_url: announcementForm.ctaUrl.trim() || null,
      product_id: null,
      theme: announcementForm.theme,
      visual_style: "minimal",
      sort_order: 0,
      show_on_web: announcementForm.showOnWeb,
      show_on_mobile: announcementForm.showOnMobile,
      show_product_price: false,
      qualifying_bag_size_kg: null,
      reward_text: null,
      reward_quantity: null,
      starts_at: null,
      ends_at: null,
    };
    try {
      if (current) {
        await tablesDB.updateRow({
          databaseId: DATABASE_ID,
          tableId: STOREFRONT_CONTENT_TABLE_ID,
          rowId: current.$id,
          data,
        });
      } else {
        await tablesDB.createRow({
          databaseId: DATABASE_ID,
          tableId: STOREFRONT_CONTENT_TABLE_ID,
          rowId: "announcement-bar",
          data,
        });
      }
      toast.success("Announcement updated everywhere");
      await load();
    } catch (error) {
      console.error("Could not save announcement:", error);
      toast.error("Could not save announcement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminAuthGuard requiredPermission={AdminPermission.FULL_ACCESS}>
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-amber-700">
              <Radio className="h-4 w-4" /> Live storefront controls
            </div>
            <h1 className="text-4xl font-black tracking-[-0.04em] text-[#27247b]">
              Promotions & announcement
            </h1>
            <p className="mt-2 max-w-2xl text-gray-600">
              One source for the website, iPhone app, and Android app. Published changes arrive through Appwrite Realtime, with a 15-second fallback refresh.
            </p>
          </div>
          <ReadOnlyGuard>
            <Button
              onClick={() => {
                setForm({
                  ...emptyPromotion,
                  sortOrder: String((promotions.at(-1)?.sort_order ?? 0) + 10),
                });
                setShowEditor(true);
              }}
              size="lg"
            >
              <Plus className="mr-2 h-4 w-4" /> New promotion
            </Button>
          </ReadOnlyGuard>
        </header>

        {showEditor && (
          <Card className="mb-8 overflow-hidden border-amber-200 shadow-lg">
            <CardHeader className="border-b bg-amber-50/70">
              <CardTitle>{form.id ? "Edit promotion" : "Create promotion"}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-8 p-6 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)]">
              <form className="grid gap-5 sm:grid-cols-2" onSubmit={savePromotion}>
                <Field label="Offer title" className="sm:col-span-2">
                  <Input
                    maxLength={180}
                    required
                    value={form.title}
                    onChange={(event) => setForm({ ...form, title: event.target.value })}
                    placeholder="Every Grain 10kg Gift"
                  />
                </Field>
                <Field label="Description" className="sm:col-span-2">
                  <textarea
                    className="min-h-24 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#27247b] focus:ring-2 focus:ring-[#27247b]/15"
                    value={form.description}
                    onChange={(event) => setForm({ ...form, description: event.target.value })}
                    placeholder="Explain exactly what the customer gets."
                  />
                </Field>
                <Field label="Promoted product" className="sm:col-span-2">
                  <Select
                    value={form.productId || "none"}
                    onValueChange={(value) => setForm({ ...form, productId: value === "none" ? "" : value })}
                  >
                    <SelectTrigger><SelectValue placeholder="Choose a product" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No product</SelectItem>
                      {products.map((product) => (
                        <SelectItem key={product.$id} value={product.$id}>{product.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Badge text">
                  <Input value={form.badgeText} onChange={(event) => setForm({ ...form, badgeText: event.target.value })} />
                </Field>
                <Field label="Button text">
                  <Input value={form.ctaText} onChange={(event) => setForm({ ...form, ctaText: event.target.value })} />
                </Field>
                <Field label="Button link" className="sm:col-span-2">
                  <Input value={form.ctaUrl} onChange={(event) => setForm({ ...form, ctaUrl: event.target.value })} placeholder="Leave empty to open the selected product" />
                </Field>
                <Field label="Color theme">
                  <Select value={form.theme} onValueChange={(value) => setForm({ ...form, theme: value as StorefrontTheme })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{themes.map((theme) => <SelectItem key={theme.value} value={theme.value}>{theme.label}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Card layout">
                  <Select value={form.visualStyle} onValueChange={(value) => setForm({ ...form, visualStyle: value as StorefrontVisualStyle })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{layouts.map((layout) => <SelectItem key={layout.value} value={layout.value}>{layout.label}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Display order">
                  <Input min="0" type="number" value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: event.target.value })} />
                </Field>
                <Field label="Qualifying bag size (kg)">
                  <Input min="1" type="number" value={form.qualifyingBagSizeKg} onChange={(event) => setForm({ ...form, qualifyingBagSizeKg: event.target.value })} placeholder="10" />
                </Field>
                <Field label="Free reward text" className="sm:col-span-2">
                  <Input value={form.rewardText} onChange={(event) => setForm({ ...form, rewardText: event.target.value })} placeholder="Shan Biryani Masala + Kheer Mix" />
                </Field>
                <Field label="Reward quantity per bag">
                  <Input min="1" type="number" value={form.rewardQuantity} onChange={(event) => setForm({ ...form, rewardQuantity: event.target.value })} />
                </Field>
                <div />
                <Field label="Starts at">
                  <Input type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} />
                </Field>
                <Field label="Ends at">
                  <Input type="datetime-local" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} />
                </Field>
                <div className="sm:col-span-2 grid gap-3 rounded-xl border bg-gray-50 p-4 sm:grid-cols-2">
                  <Check label="Promotion enabled" checked={form.enabled} onChange={(checked) => setForm({ ...form, enabled: checked })} />
                  <Check label="Show product price" checked={form.showProductPrice} onChange={(checked) => setForm({ ...form, showProductPrice: checked })} />
                  <Check label="Show on website" checked={form.showOnWeb} onChange={(checked) => setForm({ ...form, showOnWeb: checked })} />
                  <Check label="Show on iPhone & Android" checked={form.showOnMobile} onChange={(checked) => setForm({ ...form, showOnMobile: checked })} />
                </div>
                <div className="sm:col-span-2 flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={resetEditor}>Cancel</Button>
                  <ReadOnlyGuard><Button disabled={saving} type="submit"><Save className="mr-2 h-4 w-4" />{saving ? "Saving…" : "Publish changes"}</Button></ReadOnlyGuard>
                </div>
              </form>

              <aside>
                <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-gray-500">Live preview</p>
                <PromotionCard
                  imageFileId={form.productId ? imageFileIds.get(form.productId) : undefined}
                  preview
                  product={selectedProduct}
                  promotion={previewPromotion}
                />
              </aside>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.8fr)]">
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-black text-[#27247b]">Promotion cards</h2>
              <Badge variant="secondary">{promotions.length} total</Badge>
            </div>
            {loading ? (
              <Card><CardContent className="p-10 text-center text-gray-500">Loading promotions…</CardContent></Card>
            ) : promotions.length === 0 ? (
              <Card className="border-dashed"><CardContent className="p-10 text-center"><Megaphone className="mx-auto mb-3 h-9 w-9 text-gray-400" /><p className="font-bold text-gray-700">No promotion cards yet</p><p className="mt-1 text-sm text-gray-500">Create one and it will appear above the product catalog.</p></CardContent></Card>
            ) : (
              <div className="space-y-3">
                {promotions.map((promotion) => {
                  const product = products.find((candidate) => candidate.$id === promotion.product_id);
                  return (
                    <Card key={promotion.$id} className="overflow-hidden">
                      <CardContent className="flex items-center gap-4 p-4">
                        <GripVertical className="h-5 w-5 shrink-0 text-gray-300" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-black text-[#27247b]">{promotion.title}</p>
                            <Badge className={promotion.enabled ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}>{promotion.enabled ? "Live" : "Off"}</Badge>
                          </div>
                          <p className="mt-1 truncate text-sm text-gray-500">{product?.name || "No product selected"} · order {promotion.sort_order}</p>
                        </div>
                        <ReadOnlyGuard showTooltip={false}>
                          <Button size="sm" variant="outline" onClick={() => void togglePromotion(promotion)}>{promotion.enabled ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
                        </ReadOnlyGuard>
                        <Button size="sm" variant="outline" onClick={() => editPromotion(promotion)}><Pencil className="h-4 w-4" /></Button>
                        <ReadOnlyGuard showTooltip={false}>
                          <Button size="sm" variant="outline" onClick={() => void deletePromotion(promotion)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                        </ReadOnlyGuard>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <Card className="border-[#27247b]/20">
              <CardHeader className="border-b bg-[#27247b] text-white">
                <CardTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5" /> Announcement bar</CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <form className="space-y-4" onSubmit={saveAnnouncement}>
                  <Field label="Announcement text"><textarea className="min-h-24 w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#27247b] focus:ring-2 focus:ring-[#27247b]/15" value={announcementForm.title} onChange={(event) => setAnnouncementForm({ ...announcementForm, title: event.target.value })} /></Field>
                  <Field label="Button text"><Input value={announcementForm.ctaText} onChange={(event) => setAnnouncementForm({ ...announcementForm, ctaText: event.target.value })} /></Field>
                  <Field label="Button link"><Input value={announcementForm.ctaUrl} onChange={(event) => setAnnouncementForm({ ...announcementForm, ctaUrl: event.target.value })} /></Field>
                  <Field label="Color theme"><Select value={announcementForm.theme} onValueChange={(value) => setAnnouncementForm({ ...announcementForm, theme: value as StorefrontTheme })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{themes.map((theme) => <SelectItem key={theme.value} value={theme.value}>{theme.label}</SelectItem>)}</SelectContent></Select></Field>
                  <div className="space-y-3 rounded-xl border bg-gray-50 p-4">
                    <Check label="Announcement enabled" checked={announcementForm.enabled} onChange={(checked) => setAnnouncementForm({ ...announcementForm, enabled: checked })} />
                    <Check label="Show on website" checked={announcementForm.showOnWeb} onChange={(checked) => setAnnouncementForm({ ...announcementForm, showOnWeb: checked })} />
                    <Check label="Show on iPhone & Android" checked={announcementForm.showOnMobile} onChange={(checked) => setAnnouncementForm({ ...announcementForm, showOnMobile: checked })} />
                  </div>
                  <ReadOnlyGuard><Button className="w-full" disabled={saving} type="submit"><Save className="mr-2 h-4 w-4" />Save announcement</Button></ReadOnlyGuard>
                </form>
              </CardContent>
            </Card>
            <div className="mt-4 flex gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
              <CalendarClock className="mt-0.5 h-5 w-5 shrink-0" />
              <p>Promotion start and end times use your browser time zone and are stored as exact Appwrite timestamps.</p>
            </div>
          </section>
        </div>
      </main>
    </AdminAuthGuard>
  );
}

function Field({ children, className = "", label }: { children: React.ReactNode; className?: string; label: string }) {
  return <label className={`block ${className}`}><span className="mb-1.5 block text-sm font-bold text-gray-700">{label}</span>{children}</label>;
}

function Check({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-gray-700"><input checked={checked} className="h-4 w-4 accent-[#27247b]" onChange={(event) => onChange(event.target.checked)} type="checkbox" />{label}</label>;
}
