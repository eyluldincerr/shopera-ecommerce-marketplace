import { useTranslation } from "react-i18next";

import AddressCard from "./AddressCard";

function AddressPicker({
  addresses,
  selectedAddressId,
  onSelectAddress,
  onAddAddress,
  onEditAddress,
}) {
  const { t } = useTranslation();
  return (
    <section className="address-picker">
      <div className="address-picker__header">
        <div>
          <h3>{t("buyer.address.savedAddresses")}</h3>
          <p>{t("buyer.address.selectDelivery")}</p>
        </div>

        <button type="button" onClick={onAddAddress}>
          {t("buyer.address.addTitle")}
        </button>
      </div>

      <div className="addresses-grid address-picker__grid">
        {addresses.map((address) => (
          <AddressCard
            key={address.addressId}
            address={address}
            isSelectable
            isSelected={selectedAddressId === address.addressId}
            onSelect={onSelectAddress}
            onEdit={onEditAddress}
          />
        ))}
      </div>
    </section>
  );
}

export default AddressPicker;
