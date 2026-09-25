import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import AddressCard from "../../components/address/AddressCard";
import AddressFormModal from "../../components/address/AddressFormModal";
import AddressPicker from "../../components/address/AddressPicker";
import {
  createShippingSnapshot,
  isAddressComplete,
} from "../../components/address/addressUtils";
import { getMyProfile } from "../../services/accountService";
import {
  createAddress,
  getMyAddresses,
  updateAddress,
} from "../../services/addressService";
import { useCheckoutData } from "../../hooks/useCheckoutData.js";
import { saveCheckoutShippingAddress } from "../../services/checkoutService.js";
import {
  CheckoutLayout,
  CheckoutPanel,
} from "./CheckoutLayout";

const getPreferredAddress = (addresses) =>
  addresses.find((address) => address.isDefaultShipping) || addresses[0] || null;

const getAddressErrorMessage = (error, t, fallbackKey) => {
  if (error?.status === 400) return error.message || t("buyer.address.errors.validation");
  if (error?.status === 401) return t("buyer.address.errors.sessionExpired");
  if (error?.status === 403) return t("buyer.address.errors.buyerRequired");
  if (error?.status === 404) return t("buyer.address.errors.unavailable");
  if (error?.isNetworkError) return t("buyer.address.errors.network");
  return error?.message || t(fallbackKey);
};

function CheckoutShippingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const checkoutData = useCheckoutData();
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [editingAddress, setEditingAddress] = useState(null);
  const [recipient, setRecipient] = useState({ recipientName: "", recipientPhone: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [shouldSaveAddress, setShouldSaveAddress] = useState(true);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isCurrent = true;
    const loadShippingData = async () => {
      setIsLoading(true);
      try {
        const [savedAddresses, profile] = await Promise.all([
          getMyAddresses(),
          getMyProfile(),
        ]);
        if (!isCurrent) return;
        setAddresses(savedAddresses);
        setSelectedAddress(getPreferredAddress(savedAddresses));
        setRecipient({
          recipientName: profile.fullName || "",
          recipientPhone: profile.phoneNumber || "",
        });
      } catch (error) {
        if (isCurrent) setMessage(getAddressErrorMessage(error, t, "checkout.addressLoadError"));
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    };

    loadShippingData();
    return () => { isCurrent = false; };
  }, [t]);

  const selectedAddressId = selectedAddress?.isTemporary ? "" : selectedAddress?.addressId || "";
  const modalInitialData = useMemo(() => editingAddress || ({
    isDefaultShipping: addresses.length === 0,
    isDefaultBilling: false,
  }), [addresses.length, editingAddress]);
  const canContinue = Boolean(
    !isLoading &&
    !isSavingAddress &&
    isAddressComplete(selectedAddress) &&
    String(recipient.recipientName || "").trim()
  );

  const openAddModal = () => {
    setEditingAddress(null);
    setMessage("");
    setIsModalOpen(true);
  };
  const openEditModal = (address) => {
    if (address?.isTemporary) return;
    setEditingAddress(address);
    setMessage("");
    setIsModalOpen(true);
  };
  const closeModal = () => {
    if (isSavingAddress) return;
    setEditingAddress(null);
    setIsModalOpen(false);
  };
  const handleSelectAddress = (addressId) => {
    setSelectedAddress(addresses.find((address) => address.addressId === addressId) || null);
    setMessage("");
  };
  const handleRecipientChange = (event) => {
    const { name, value } = event.target;
    setRecipient((current) => ({ ...current, [name]: value }));
    setMessage("");
  };

  const handleSaveAddress = async (addressData) => {
    if (isSavingAddress) return;
    try {
      setIsSavingAddress(true);
      if (editingAddress) {
        const result = await updateAddress(editingAddress.addressId, addressData);
        setAddresses(result.addresses);
        setSelectedAddress(result.address);
        setMessage(t("checkout.addressUpdated"));
      } else if (shouldSaveAddress) {
        const result = await createAddress(addressData);
        setAddresses(result.addresses);
        setSelectedAddress(result.address);
        setMessage(t("checkout.addressAdded"));
      } else {
        setSelectedAddress({ ...addressData, isTemporary: true });
        setMessage(t("checkout.temporaryAddressAdded"));
      }
      setEditingAddress(null);
      setIsModalOpen(false);
    } catch (error) {
      setMessage(getAddressErrorMessage(error, t, "checkout.addressSaveError"));
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleContinue = () => {
    if (!isAddressComplete(selectedAddress)) {
      setMessage(t("checkout.selectAddress"));
      return;
    }
    if (!String(recipient.recipientName || "").trim()) {
      setMessage(t("checkout.recipientRequired"));
      return;
    }

    saveCheckoutShippingAddress(createShippingSnapshot(selectedAddress, recipient));
    navigate("/checkout/review");
  };

  return (
    <>
      <CheckoutLayout
        activeStepId="shipping"
        checkoutData={checkoutData}
        message={message}
        onPrimary={handleContinue}
        primaryDisabled={!canContinue}
        primaryLabel={t("checkout.continueReview")}
      >
        <CheckoutPanel title={t("checkout.shippingAddress")} subtitle={t("checkout.shippingSubtitle")} icon="shipping">
          <section className="checkout-recipient" aria-labelledby="checkout-recipient-title">
            <h2 id="checkout-recipient-title">{t("checkout.recipientDetails")}</h2>
            <div className="checkout-form">
              <label className="checkout-field checkout-field--full">
                <span>{t("checkout.recipientName")}</span>
                <input name="recipientName" type="text" value={recipient.recipientName} onChange={handleRecipientChange} aria-required="true" />
              </label>
              <label className="checkout-field checkout-field--full">
                <span>{t("checkout.recipientPhone")}</span>
                <input name="recipientPhone" type="tel" value={recipient.recipientPhone} onChange={handleRecipientChange} />
              </label>
            </div>
          </section>

          {isLoading ? (
            <p role="status" aria-live="polite">{t("buyer.address.loading")}</p>
          ) : addresses.length > 0 ? (
            <>
              <AddressPicker addresses={addresses} selectedAddressId={selectedAddressId} onSelectAddress={handleSelectAddress} onAddAddress={openAddModal} onEditAddress={openEditModal} />
            </>
          ) : (
            <section className="checkout-no-addresses">
              <p>{t("checkout.noAddresses")}</p>
              <button type="button" onClick={openAddModal}>{t("checkout.addShippingAddress")}</button>
            </section>
          )}

          {selectedAddress?.isTemporary && (
            <div className="checkout-temp-address">
              <h3>{t("checkout.orderAddress")}</h3>
              <AddressCard address={selectedAddress} />
            </div>
          )}

          {selectedAddress?.isTemporary && !editingAddress && (
            <label className="checkout-save-address-check">
              <input type="checkbox" checked={shouldSaveAddress} onChange={(event) => setShouldSaveAddress(event.target.checked)} disabled={isSavingAddress} />
              <span>{t("checkout.saveAddress")}</span>
            </label>
          )}
        </CheckoutPanel>
      </CheckoutLayout>

      <AddressFormModal isOpen={isModalOpen} mode={editingAddress ? "edit" : "add"} initialData={modalInitialData} onClose={closeModal} onSave={handleSaveAddress} />
    </>
  );
}

export default CheckoutShippingPage;
