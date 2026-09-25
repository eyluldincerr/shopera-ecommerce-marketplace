import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  Eye,
  Package,
  Search,
} from "lucide-react";

import AdminConfirmModal from "../../components/admin/AdminConfirmModal";
import AdminDataTable from "../../components/admin/AdminDataTable";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import AdminPageLayout from "../../components/admin/AdminPageLayout";
import AdminPagination from "../../components/admin/AdminPagination";
import AdminStatusBadge from "../../components/admin/AdminStatusBadge";
import ProductDetailsModal from "../../components/admin/ProductDetailsModal";

import {
  getAdminProductById,
  getAdminProductsPage,
  updateAdminProductStatus,
} from "../../api/adminProductService";

const currencyFormatter =
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
  });

const initialConfirmationState = {
  isOpen: false,
  action: "",
  product: null,
  targetStatus: "",
  title: "",
  message: "",
  confirmLabel: "Confirm",
  variant: "warning",
};

function ManageProductsPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [
    products,
    setProducts,
  ] = useState([]);

  const [
    searchValue,
    setSearchValue,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("ALL");

  const [
    selectedProduct,
    setSelectedProduct,
  ] = useState(null);

  const [
    confirmation,
    setConfirmation,
  ] = useState(initialConfirmationState);

  const [
    detailLoadingProductId,
    setDetailLoadingProductId,
  ] = useState(null);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const [
    isProcessing,
    setIsProcessing,
  ] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const loadProducts =
      async () => {
        try {
          setIsLoading(true);
          setErrorMessage("");

          const loadedProducts = await getAdminProductsPage({
            page,
            pageSize,
            search: searchValue.trim() || undefined,
            status: statusFilter === "ALL" ? undefined : statusFilter,
          });

          setProducts(
            Array.isArray(
              loadedProducts.items
            )
              ? loadedProducts.items
              : []
          );
          setTotalCount(Number(loadedProducts.totalCount || 0));
        } catch (error) {
          console.error(
            "Products could not be loaded:",
            error
          );

          setErrorMessage(
            error.message ||
              "Products could not be loaded."
          );
        } finally {
          setIsLoading(false);
        }
      };

    loadProducts();
  }, [page, pageSize, searchValue, statusFilter]);

  useEffect(() => {
    const selectedProductId =
      Number(
        location.state
          ?.selectedProductId
      );

    if (
      !selectedProductId ||
      isLoading
    ) {
      return;
    }

    let effectIsActive = true;

    const openSelectedProduct =
      async () => {
        try {
          setSearchValue("");
          setStatusFilter("ALL");

          setDetailLoadingProductId(
            selectedProductId
          );

          setErrorMessage("");

          const fullProduct =
            await getAdminProductById(
              selectedProductId
            );

          if (effectIsActive) {
            setSelectedProduct(
              fullProduct
            );
          }
        } catch (error) {
          console.error(
            "Selected product details could not be loaded:",
            error
          );

          if (effectIsActive) {
            setErrorMessage(
              error.message ||
                `Product #${selectedProductId} details could not be loaded.`
            );
          }
        } finally {
          if (effectIsActive) {
            setDetailLoadingProductId(
              null
            );
          }

          navigate(
            location.pathname,
            {
              replace: true,
              state: null,
            }
          );
        }
      };

    openSelectedProduct();

    return () => {
      effectIsActive = false;
    };
  }, [
    isLoading,
    location.pathname,
    location.state,
    navigate,
  ]);

  useEffect(() => {
    const notificationStatusFilter =
      location.state?.statusFilter;

    if (
      !notificationStatusFilter ||
      isLoading
    ) {
      return;
    }

    setSearchValue("");

    setStatusFilter(
      notificationStatusFilter
    );


    navigate(location.pathname, {
      replace: true,
      state: null,
    });
  }, [
    isLoading,
    location.pathname,
    location.state,
    navigate,
  ]);

  const productCounts =
    useMemo(() => {
      return {
        total:
          products.length,

        draft:
          products.filter(
            (product) =>
              product.status ===
              "DRAFT"
          ).length,

        active:
          products.filter(
            (product) =>
              product.status ===
              "ACTIVE"
          ).length,

        inactive:
          products.filter(
            (product) =>
              product.status ===
              "INACTIVE"
          ).length,

        outOfStock:
          products.filter(
            (product) =>
              product.status ===
              "OUT_OF_STOCK"
          ).length,

        deleted:
          products.filter(
            (product) =>
              product.status ===
              "DELETED"
          ).length,
      };
    }, [products]);

  const formatPriceRange = (
    product
  ) => {
    if (
      product.minimumPrice ===
      null
    ) {
      return "No variants";
    }

    if (
      product.minimumPrice ===
      product.maximumPrice
    ) {
      return currencyFormatter.format(
        product.minimumPrice
      );
    }

    return `${currencyFormatter.format(
      product.minimumPrice
    )} – ${currencyFormatter.format(
      product.maximumPrice
    )}`;
  };

  const openProductDetails =
    async (product) => {
      try {
        setDetailLoadingProductId(
          product.productId
        );

        setErrorMessage("");

        const fullProduct =
          await getAdminProductById(
            product.productId
          );

        setSelectedProduct(
          fullProduct
        );
      } catch (error) {
        console.error(
          "Product details could not be loaded:",
          error
        );

        setErrorMessage(
          error.message ||
            "Product details could not be loaded."
        );
      } finally {
        setDetailLoadingProductId(
          null
        );
      }
    };

  const closeConfirmation = () => {
    if (!isProcessing) {
      setConfirmation(initialConfirmationState);
    }
  };

  const requestProductAction = (action, product) => {
    setSelectedProduct(null);
    setSuccessMessage("");
    setErrorMessage("");

    const configurations = {
      activate: {
        targetStatus: "ACTIVE",
        title: "Activate Product?",
        message: `${product.productName} will receive ACTIVE status. It is only sellable when the Store and an in-stock variant are also active.`,
        confirmLabel: "Activate Product",
        variant: "success",
      },
      deactivate: {
        targetStatus: "INACTIVE",
        title: "Deactivate Product?",
        message: `${product.productName} will be hidden from the public catalogue. Product history, variants, orders, and reviews remain preserved.`,
        confirmLabel: "Deactivate Product",
        variant: "warning",
      },
      delete: {
        targetStatus: "DELETED",
        title: "Soft-delete Product?",
        message: `${product.productName} will receive DELETED status and disappear from normal Seller/Buyer product lists. Historical records are not removed.`,
        confirmLabel: "Soft Delete",
        variant: "danger",
      },
      restore: {
        targetStatus: "INACTIVE",
        title: "Restore Product?",
        message: `${product.productName} will be restored to INACTIVE status. An Admin can activate it after reviewing the Store and product availability.`,
        confirmLabel: "Restore Product",
        variant: "success",
      },
    };

    const configuration = configurations[action];
    if (!configuration) {
      setErrorMessage("Unsupported Product action.");
      return;
    }

    setConfirmation({
      isOpen: true,
      action,
      product,
      ...configuration,
    });
  };

  const confirmProductAction = async () => {
    if (!confirmation.product || !confirmation.targetStatus) {
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMessage("");
      setSuccessMessage("");

      const updatedProduct = await updateAdminProductStatus(
        confirmation.product.productId,
        confirmation.targetStatus
      );

      setProducts((currentProducts) =>
        currentProducts.map((product) =>
          Number(product.productId) === Number(updatedProduct.productId)
            ? { ...product, ...updatedProduct }
            : product
        )
      );

      setSuccessMessage(
        `${updatedProduct.productName} is now ${updatedProduct.status}.`
      );
      setConfirmation(initialConfirmationState);
      window.dispatchEvent(new Event("admin-data-updated"));
    } catch (error) {
      console.error("Product status could not be updated:", error);
      setErrorMessage(
        error.message || "Product status could not be updated."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const resetFilters = () => {
    setPage(1);
    setSearchValue("");
    setStatusFilter("ALL");
  };

  const columns = [
    {
      key: "product",
      header: "Product",

      render: (product) => (
        <div className="admin-product-table-profile">
          <div className="admin-product-table-image">
            {product.primaryImageUrl ? (
              <img
                src={
                  product.primaryImageUrl
                }
                alt={
                  product.primaryImageAlt
                }
              />
            ) : (
              <Package size={19} />
            )}
          </div>

          <div>
            <strong>
              {product.productName}
            </strong>

            <span>
              {product.brand ||
                "No product brand"}{" "}
              · #{product.productId}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "sellerName",
      header: "Brand Store",
    },
    {
      key: "categoryName",
      header: "Category",

      render: (product) => (
        <span className="admin-table-category">
          {product.categoryName}
        </span>
      ),
    },
    {
      key: "productCondition",
      header: "Condition",

      render: (product) => (
        <AdminStatusBadge
          status={
            product.productCondition
          }
        />
      ),
    },
    {
      key: "price",
      header: "Price",

      render: (product) => (
        <strong className="admin-product-price">
          {formatPriceRange(
            product
          )}
        </strong>
      ),
    },
    {
      key: "variants",
      header: "Variants",

      render: (product) =>
        product.variantCount,
    },
    {
      key: "stock",
      header: "Total Stock",

      render: (product) => (
        <span
          className={
            product.totalStock === 0
              ? "admin-product-stock-empty"
              : "admin-product-stock-available"
          }
        >
          {product.totalStock}
        </span>
      ),
    },
    {
      key: "saleAvailability",
      header: "Sale",

      render: (product) => (
        <strong>
          {product.isSaleEnabled
            ? "Enabled"
            : "Disabled"}
        </strong>
      ),
    },
    {
      key: "status",
      header: "Status",

      render: (product) => (
        <AdminStatusBadge
          status={product.status}
        />
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className:
        "admin-table-actions-column",

      render: (product) => (
        <button
          type="button"
          className="admin-table-view-button"
          onClick={() =>
            openProductDetails(
              product
            )
          }
          disabled={
            detailLoadingProductId ===
            product.productId
          }
        >
          <Eye size={16} />

          {detailLoadingProductId ===
          product.productId
            ? "Loading..."
            : "Manage"}
        </button>
      ),
    },
  ];

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Product Oversight"
        description="Review product details and safely activate, deactivate, soft-delete, or restore product status."
      />

      <section className="admin-product-overview-grid">
        <article className="admin-product-overview-card">
          <span>Total Products</span>

          <strong>
            {productCounts.total}
          </strong>
        </article>

        <article className="admin-product-overview-card">
          <span>Draft</span>

          <strong>
            {productCounts.draft}
          </strong>
        </article>

        <article className="admin-product-overview-card">
          <span>Active</span>

          <strong>
            {productCounts.active}
          </strong>
        </article>

        <article className="admin-product-overview-card">
          <span>Inactive</span>

          <strong>
            {productCounts.inactive}
          </strong>
        </article>

        <article className="admin-product-overview-card">
          <span>Out of Stock</span>

          <strong>
            {
              productCounts.outOfStock
            }
          </strong>
        </article>

        <article className="admin-product-overview-card">
          <span>Deleted</span>

          <strong>
            {productCounts.deleted}
          </strong>
        </article>
      </section>

      {successMessage && (
        <div className="admin-page-notice admin-page-notice-success">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="admin-page-notice admin-page-notice-error">
          {errorMessage}
        </div>
      )}

      <section className="admin-products-panel">
        <div className="admin-products-toolbar">
          <div className="admin-users-search">
            <Search size={18} />

            <input
              type="search"
              value={searchValue}
              onChange={(event) => { setSearchValue(event.target.value); setPage(1); }}
              placeholder="Search product, brand, model, condition, brand store or ID..."
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}
            aria-label="Filter products by status"
          >
            <option value="ALL">
              All statuses
            </option>

            <option value="DRAFT">
              DRAFT
            </option>

            <option value="ACTIVE">
              ACTIVE
            </option>

            <option value="INACTIVE">
              INACTIVE
            </option>

            <option value="OUT_OF_STOCK">
              OUT OF STOCK
            </option>

            <option value="DELETED">
              DELETED
            </option>
          </select>

          <button
            type="button"
            className="admin-reset-filters-button"
            onClick={resetFilters}
          >
            Reset filters
          </button>
        </div>

        <div className="admin-users-results-heading">
          <div>
            <Package size={18} />

            <strong>
              {
                totalCount
              }{" "}
              products found
            </strong>
          </div>
        </div>

        {isLoading ? (
          <div className="admin-page-loading">
            Loading products...
          </div>
        ) : (
          <div className="admin-products-table">
            <AdminDataTable
              columns={columns}
              data={
                products
              }
              rowKey="productId"
              emptyMessage="No products match the selected filters."
            />
            <AdminPagination page={page} pageSize={pageSize} totalCount={totalCount} isLoading={isLoading} itemLabel="products" onPageChange={setPage} />
          </div>
        )}
      </section>

      <ProductDetailsModal
        isOpen={Boolean(
          selectedProduct
        )}
        product={selectedProduct}
        onClose={() =>
          setSelectedProduct(
            null
          )
        }
        onRequestAction={requestProductAction}
      />

      <AdminConfirmModal
        isOpen={confirmation.isOpen}
        title={confirmation.title}
        message={confirmation.message}
        confirmLabel={confirmation.confirmLabel}
        variant={confirmation.variant}
        isProcessing={isProcessing}
        onConfirm={confirmProductAction}
        onCancel={closeConfirmation}
      />

    </AdminPageLayout>
  );
}

export default ManageProductsPage;
