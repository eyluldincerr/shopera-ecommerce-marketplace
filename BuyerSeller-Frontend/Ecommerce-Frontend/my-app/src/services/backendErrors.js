export const BACKEND_NOT_CONFIGURED = "BACKEND_NOT_CONFIGURED";

export class BackendNotConfiguredError extends Error {
  constructor(resource) {
    super("Product and store data is not available until the backend is configured.");
    this.name = "BackendNotConfiguredError";
    this.code = BACKEND_NOT_CONFIGURED;
    this.resource = resource;
  }
}

export const requireEndpoint = (endpoint, resource) => {
  if (!endpoint) {
    throw new BackendNotConfiguredError(resource);
  }

  return endpoint;
};

export const isBackendNotConfiguredError = (error) =>
  error?.code === BACKEND_NOT_CONFIGURED;
