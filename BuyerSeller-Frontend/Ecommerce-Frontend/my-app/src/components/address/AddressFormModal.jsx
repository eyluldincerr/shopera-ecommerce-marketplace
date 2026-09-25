import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import useOverlayAccessibility from "../../hooks/useOverlayAccessibility";
import { ADDRESS_FIELD_LIMITS } from "../../services/mappers/addressMapper.js";

const emptyAddressForm = {
  addressLabel: "",
  streetAddress: "",
  city: "",
  stateProvince: "",
  postalCode: "",
  country: "",
  isDefaultShipping: false,
  isDefaultBilling: false,
};

const addressFieldLabelKeys = {
  addressLabel: "label",
  streetAddress: "street",
  city: "city",
  stateProvince: "stateProvince",
  postalCode: "postalCode",
  country: "country",
};

function AddressFormModal({ isOpen, mode, initialData, onClose, onSave }) {
  const { t } = useTranslation();
  const titleId = useId();
  const descriptionId = useId();
  const savingRef = useRef(false);
  const [form, setForm] = useState(emptyAddressForm);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const addressOverlay = useOverlayAccessibility({
    isOpen,
    onClose,
    preventClose: isSaving,
  });

  useEffect(() => {
    if (!isOpen) return;

    setForm({ ...emptyAddressForm, ...initialData });
    setErrors({});
    setIsSaving(false);
    savingRef.current = false;
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
    setErrors((current) => ({ ...current, [name]: "" }));
  };

  const validateForm = () => {
    const nextErrors = {};
    [["country", "country"], ["city", "city"], ["streetAddress", "street"]].forEach(([field, key]) => {
      if (!String(form[field] || "").trim()) {
        nextErrors[field] = t(`buyer.address.validation.${key}`);
      }
    });
    Object.entries(ADDRESS_FIELD_LIMITS).forEach(([field, maxLength]) => {
      if (String(form[field] || "").trim().length > maxLength) {
        nextErrors[field] = t("buyer.address.validation.maxLength", {
          field: t(`buyer.address.${addressFieldLabelKeys[field]}`),
          count: maxLength,
        });
      }
    });
    return nextErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (savingRef.current) return;

    const nextErrors = validateForm();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      requestAnimationFrame(() => {
        addressOverlay.overlayRef.current
          ?.querySelector('[aria-invalid="true"]')
          ?.focus();
      });
      return;
    }

    try {
      savingRef.current = true;
      setIsSaving(true);
      await onSave(form);
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  const field = (name, labelKey, placeholderKey, { optional = false } = {}) => (
    <label className="address-form__field" key={name}>
      <span>{t(labelKey)}</span>
      <input
        ref={name === "addressLabel" ? addressOverlay.initialFocusRef : undefined}
        name={name}
        type="text"
        maxLength={ADDRESS_FIELD_LIMITS[name]}
        value={form[name] ?? ""}
        onChange={handleChange}
        placeholder={placeholderKey ? t(placeholderKey) : undefined}
        aria-invalid={Boolean(errors[name])}
        aria-describedby={errors[name] ? `address-${name}-error` : undefined}
      />
      {errors[name] && <small id={`address-${name}-error`} role="alert">{errors[name]}</small>}
      {optional && <small className="address-form__hint">{t("buyer.address.optional")}</small>}
    </label>
  );

  return (
    <div ref={addressOverlay.overlayRef} className="address-modal" role="presentation">
      <div className="address-modal__panel" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} tabIndex="-1">
        <div className="address-modal__header">
          <div>
            <h2 id={titleId}>{mode === "edit" ? t("buyer.address.editTitle") : t("buyer.address.addTitle")}</h2>
            <p id={descriptionId}>{t("buyer.address.description")}</p>
          </div>
          <button type="button" className="address-modal__close" onClick={onClose} aria-label={t("buyer.address.close")} disabled={isSaving}>
            <span aria-hidden="true">&times;</span>
          </button>
        </div>

        <form className="address-form" onSubmit={handleSubmit}>
          {field("addressLabel", "buyer.address.label", "buyer.address.labelPlaceholder", { optional: true })}
          {field("country", "buyer.address.country", "buyer.address.countryPlaceholder")}
          {field("city", "buyer.address.city", "buyer.address.cityPlaceholder")}
          {field("stateProvince", "buyer.address.stateProvince", "buyer.address.stateProvincePlaceholder", { optional: true })}
          {field("streetAddress", "buyer.address.street", "buyer.address.streetPlaceholder")}
          {field("postalCode", "buyer.address.postalCode", "buyer.address.postalCodePlaceholder", { optional: true })}

          <label className="address-form__checkbox">
            <input name="isDefaultShipping" type="checkbox" checked={form.isDefaultShipping} onChange={handleChange} />
            <span>{t("buyer.address.makeDefaultShipping")}</span>
          </label>
          <label className="address-form__checkbox">
            <input name="isDefaultBilling" type="checkbox" checked={form.isDefaultBilling} onChange={handleChange} />
            <span>{t("buyer.address.makeDefaultBilling")}</span>
          </label>

          <div className="address-form__actions">
            <button type="button" onClick={onClose} disabled={isSaving}>{t("common.cancel")}</button>
            <button type="submit" disabled={isSaving}>{isSaving ? t("buyer.address.saving") : t("buyer.address.save")}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddressFormModal;
