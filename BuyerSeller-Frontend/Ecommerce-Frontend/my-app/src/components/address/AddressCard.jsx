import { useTranslation } from "react-i18next";

import { formatAddressLine, formatLocationLine } from "./addressUtils";

function AddressCard({
  address,
  isSelectable = false,
  isSelected = false,
  onSelect,
  onEdit,
  onDelete,
  onSetDefault,
}) {
  const { t } = useTranslation();
  return (
    <article
      className={`address-card${isSelected ? " address-card--selected" : ""}${
        isSelectable ? " address-card--selectable" : ""
      }`}
      onClick={isSelectable ? () => onSelect?.(address.addressId) : undefined}
    >
      <div className="address-card__top">
        <span className="address-card__label">
          {address.addressLabel || t("buyer.address.unlabeled")}
        </span>

        <div className="address-card__badges">
          {isSelected && (
            <span className="address-card__selected">
              {t("buyer.address.selected")}
            </span>
          )}
          {address.isDefaultShipping && (
            <span className="address-card__badge">
              {t("buyer.address.default")}
            </span>
          )}
        </div>
      </div>

      <p className="address-card__line">{formatAddressLine(address)}</p>
      <p className="address-card__location">{formatLocationLine(address)}</p>

      <div className="address-card__actions">
        {!address.isDefaultShipping && onSetDefault && (
          <button
            type="button"
            className="address-card__default-button"
            onClick={(event) => {
              event.stopPropagation();
              onSetDefault(address.addressId);
            }}
          >
            {t("buyer.address.setDefault")}
          </button>
        )}

        {onEdit && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onEdit(address);
            }}
          >
            {t("common.edit")}
          </button>
        )}

        {onDelete && (
          <button
            type="button"
            className="address-card__delete-button"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(address);
            }}
          >
            {t("common.delete")}
          </button>
        )}
      </div>
    </article>
  );
}

export default AddressCard;
