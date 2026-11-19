"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { updateProfile, type UpdateProfileRequest } from "@/lib/api";
import AppHeader from "@/components/AppHeader";

export default function ProfilePage() {
  const router = useRouter();
  const { user, authLoading, refreshUser } = useAuth();

  const [form, setForm] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    addressState: "",
    postcode: "",
    country: "AU",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    setForm({
      firstName:    user.firstName    ?? "",
      middleName:   user.middleName   ?? "",
      lastName:     user.lastName     ?? "",
      phone:        user.phone        ?? "",
      addressLine1: user.addressLine1 ?? "",
      addressLine2: user.addressLine2 ?? "",
      city:         user.city         ?? "",
      addressState: user.addressState ?? "",
      postcode:     user.postcode     ?? "",
      country:      user.country      ?? "AU",
    });
  }, [user]);

  if (authLoading || !user) return null;

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("First name and last name are required.");
      return;
    }
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const payload: UpdateProfileRequest = {
        firstName:    form.firstName.trim(),
        middleName:   form.middleName.trim() || undefined,
        lastName:     form.lastName.trim(),
        phone:        form.phone.trim() || undefined,
        addressLine1: form.addressLine1.trim() || undefined,
        addressLine2: form.addressLine2.trim() || undefined,
        city:         form.city.trim() || undefined,
        addressState: form.addressState.trim() || undefined,
        postcode:     form.postcode.trim() || undefined,
        country:      form.country.trim() || undefined,
      };
      await updateProfile(user.id, payload);
      await refreshUser();
      setSaved(true);
    } catch {
      setError("Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent";
  const labelCls = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />

      <main className="max-w-xl mx-auto px-4 py-10">
        <div className="mb-6">
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600">← Back to dashboard</Link>
        </div>

        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Profile</h1>
          <p className="text-sm text-gray-500 mt-0.5">{user.email}</p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">

          {/* Name */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Full name</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls} htmlFor="firstName">First name *</label>
                <input id="firstName" type="text" required value={form.firstName}
                  onChange={set("firstName")} placeholder="Maria" className={inputCls} />
              </div>
              <div>
                <label className={labelCls} htmlFor="lastName">Last name *</label>
                <input id="lastName" type="text" required value={form.lastName}
                  onChange={set("lastName")} placeholder="Santos" className={inputCls} />
              </div>
            </div>

            <div>
              <label className={labelCls} htmlFor="middleName">
                Middle name <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input id="middleName" type="text" value={form.middleName}
                onChange={set("middleName")} placeholder="Cruz" className={inputCls} />
            </div>
          </div>

          {/* Contact */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Contact information</h2>

            <div>
              <label className={labelCls}>Email address</label>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 select-none">
                {user.email}
              </div>
            </div>

            <div>
              <label className={labelCls} htmlFor="phone">Phone number</label>
              <input id="phone" type="tel" value={form.phone}
                onChange={set("phone")} placeholder="+61 400 000 000" className={inputCls} />
            </div>
          </div>

          {/* Address */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Address</h2>

            <div>
              <label className={labelCls} htmlFor="addressLine1">Street address</label>
              <input id="addressLine1" type="text" value={form.addressLine1}
                onChange={set("addressLine1")} placeholder="123 King Street" className={inputCls} />
            </div>

            <div>
              <label className={labelCls} htmlFor="addressLine2">
                Apt / suite / floor <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input id="addressLine2" type="text" value={form.addressLine2}
                onChange={set("addressLine2")} placeholder="Apt 4" className={inputCls} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls} htmlFor="city">City / suburb</label>
                <input id="city" type="text" value={form.city}
                  onChange={set("city")} placeholder="Sydney" className={inputCls} />
              </div>
              <div>
                <label className={labelCls} htmlFor="addressState">State</label>
                <select id="addressState" value={form.addressState}
                  onChange={set("addressState")} className={inputCls}>
                  <option value="">Select state</option>
                  <option value="NSW">NSW</option>
                  <option value="VIC">VIC</option>
                  <option value="QLD">QLD</option>
                  <option value="WA">WA</option>
                  <option value="SA">SA</option>
                  <option value="TAS">TAS</option>
                  <option value="ACT">ACT</option>
                  <option value="NT">NT</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls} htmlFor="postcode">Postcode</label>
                <input id="postcode" type="text" value={form.postcode}
                  onChange={set("postcode")} placeholder="2000" className={inputCls} maxLength={4} />
              </div>
              <div>
                <label className={labelCls} htmlFor="country">Country</label>
                <select id="country" value={form.country}
                  onChange={set("country")} className={inputCls}>
                  <option value="AU">Australia</option>
                </select>
              </div>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}
          {saved && (
            <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">Profile saved.</p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
          >
            {saving ? "Saving…" : "Save profile"}
          </button>
        </form>
      </main>
    </div>
  );
}
