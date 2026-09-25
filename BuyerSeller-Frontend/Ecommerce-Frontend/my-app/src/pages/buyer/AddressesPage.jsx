import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import BuyerAccountLayout from "../../components/account/BuyerAccountLayout";
import AddressCard from "../../components/address/AddressCard";
import AddressFormModal from "../../components/address/AddressFormModal";
import { getMyProfile } from "../../services/accountService";
import {
  createAddress,
  deleteAddress,
  getMyAddresses,
  setDefaultShippingAddress,
  updateAddress,
} from "../../services/addressService";

const getAddressErrorMessage = (error, t, fallbackKey) => {
  if (error?.status === 400) return error.message || t("buyer.address.errors.validation");
  if (error?.status === 401) return t("buyer.address.errors.sessionExpired");
  if (error?.status === 403) return t("buyer.address.errors.buyerRequired");
  if (error?.status === 404) return t("buyer.address.errors.unavailable");
  if (error?.isNetworkError) return t("buyer.address.errors.network");
  return error?.message || t(fallbackKey);
};

function AddressesPage() {
  const { t } = useTranslation();
  const [profile, setProfile] = useState({ fullName: "", role: "Buyer", profilePhoto: "" });
  const [addresses, setAddresses] = useState([]);
  const [editingAddress, setEditingAddress] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const modalInitialData = useMemo(
    () =>
      editingAddress || {
        isDefaultShipping: addresses.length === 0,
        isDefaultBilling: false,
      },
    [addresses.length, editingAddress]
  );

  useEffect(() => {
    let isCurrent = true;
    const loadPageData = async () => {
      try {
        setIsLoading(true);
        const [profileData, addressData] = await Promise.all([getMyProfile(), getMyAddresses()]);
        if (!isCurrent) return;
        setProfile(profileData);
        setAddresses(addressData);
      } catch (error) {
        if (isCurrent) setErrorMessage(getAddressErrorMessage(error, t, "buyer.address.errors.load"));
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    };
    loadPageData();
    return () => { isCurrent = false; };
  }, [t]);

  const openAddModal = () => {
    setEditingAddress(null);
    setSuccessMessage("");
    setErrorMessage("");
    setIsModalOpen(true);
  };
  const openEditModal = (address) => {
    setEditingAddress(address);
    setSuccessMessage("");
    setErrorMessage("");
    setIsModalOpen(true);
  };
  const closeModal = () => {
    if (!isSaving) {
      setIsModalOpen(false);
      setEditingAddress(null);
    }
  };
  const handleSaveAddress = async (addressData) => {
    if (isSaving) return;
    try {
      setIsSaving(true);
      const result = editingAddress
        ? await updateAddress(editingAddress.addressId, addressData)
        : await createAddress(addressData);
      setAddresses(result.addresses);
      setSuccessMessage(t(editingAddress ? "buyer.address.messages.updated" : "buyer.address.messages.added"));
      setErrorMessage("");
      setIsModalOpen(false);
      setEditingAddress(null);
    } catch (error) {
      setErrorMessage(getAddressErrorMessage(error, t, "buyer.address.errors.save"));
    } finally {
      setIsSaving(false);
    }
  };
  const handleDeleteAddress = async (address) => {
    if (isSaving) return;
    if (!window.confirm(t("buyer.address.confirmDelete", { label: address.addressLabel }))) return;
    try {
      setIsSaving(true);
      setAddresses(await deleteAddress(address.addressId));
      setSuccessMessage(t("buyer.address.messages.deleted"));
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(getAddressErrorMessage(error, t, "buyer.address.errors.delete"));
    } finally {
      setIsSaving(false);
    }
  };
  const handleSetDefault = async (addressId) => {
    if (isSaving) return;
    try {
      setIsSaving(true);
      const result = await setDefaultShippingAddress(addressId);
      setAddresses(result.addresses);
      setSuccessMessage(t("buyer.address.messages.defaultUpdated"));
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(getAddressErrorMessage(error, t, "buyer.address.errors.default"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <BuyerAccountLayout activePath="/account/addresses" pageClassName="addresses-page" profile={profile}>
        <section className="addresses-content" aria-busy={isLoading || isSaving}>
          <div className="addresses-header">
            <div><h1>{t("buyer.address.pageTitle")}</h1><p>{t("buyer.address.pageSubtitle")}</p></div>
            <button type="button" className="addresses-primary-button" onClick={openAddModal} disabled={isSaving}>{t("buyer.address.addButton")}</button>
          </div>
          {successMessage && <div className="profile-alert success" role="status">{successMessage}</div>}
          {errorMessage && <div className="profile-alert error" role="alert">{errorMessage}</div>}
          {isLoading ? <div className="profile-loading-card" role="status">{t("buyer.address.loading")}</div> : addresses.length === 0 ? (
            <section className="addresses-empty">
              <div className="addresses-empty__icon" aria-hidden="true">+</div>
              <h2>{t("buyer.address.emptyTitle")}</h2><p>{t("buyer.address.emptyDescription")}</p>
              <button type="button" onClick={openAddModal} disabled={isSaving}>{t("buyer.address.emptyAction")}</button>
            </section>
          ) : (
            <div className="addresses-grid">
              {addresses.map((address) => <AddressCard key={address.addressId} address={address} onEdit={openEditModal} onDelete={handleDeleteAddress} onSetDefault={handleSetDefault} />)}
              <button type="button" className="address-add-card" onClick={openAddModal} disabled={isSaving}><span aria-hidden="true">+</span>{t("buyer.address.addShort")}</button>
            </div>
          )}
        </section>
      </BuyerAccountLayout>
      <AddressFormModal isOpen={isModalOpen} mode={editingAddress ? "edit" : "add"} initialData={modalInitialData} onClose={closeModal} onSave={handleSaveAddress} />
    </>
  );
}

export default AddressesPage;
