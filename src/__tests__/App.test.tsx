import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";

describe("App (home)", () => {
  beforeEach(() => {
    // mock do fetch usado por FiagroExplorer
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          headers: {
            get: (key: string) =>
              key.toLowerCase() === "content-type" ? "application/json" : null,
          },
          json: () =>
            Promise.resolve({
              page: { pageNumber: 1, pageSize: 0, totalRecords: 0, totalPages: 0 },
              results: [],
            }),
        }),
      ) as unknown as typeof fetch,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renderiza o FiagroExplorer na home", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("fiagro-explorer")).toBeInTheDocument();
    });
  });
});
