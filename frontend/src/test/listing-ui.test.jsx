import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import ListingGrid from "../components/ListingGrid";
import LocationControl from "../components/LocationControl";

const baseProps = {
  user: { id: "user-1" },
  activeTab: "community",
  setActiveTab: vi.fn(),
  filterType: "all",
  setFilterType: vi.fn(),
  searchQuery: "",
  setSearchQuery: vi.fn(),
  radius: 2,
  canLoadMore: false,
  onLoadMore: vi.fn(),
  onDelete: vi.fn(),
  onRequest: vi.fn(),
};

it("renders explicit loading and empty listing states", () => {
  const { rerender } = render(<ListingGrid {...baseProps} listings={[]} isLoading/>);
  expect(screen.getByRole("status")).toHaveTextContent("Loading nearby listings");
  rerender(<ListingGrid {...baseProps} listings={[]} isLoading={false}/>);
  expect(screen.getByText("No listings found")).toBeInTheDocument();
});

it("shows request permission only for another user's active listing", async () => {
  const onRequest = vi.fn();
  const listing = {
    id: "listing-1", authorId: "user-2", title: "Power drill", description: "Available for your weekend project",
    type: "item", status: "active", media: [], distanceMeters: 800,
  };
  const user = userEvent.setup();
  render(<ListingGrid {...baseProps} listings={[listing]} isLoading={false} onRequest={onRequest}/>);
  await user.click(screen.getByRole("button", { name: "Request Power drill" }));
  expect(onRequest).toHaveBeenCalledWith(listing);
  expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
});

it("manual coordinates are parsed and submitted after permission failure", async () => {
  const onManual = vi.fn();
  const user = userEvent.setup();
  render(<LocationControl status="manual" error="Permission denied" onRetry={vi.fn()} onManual={onManual}/>);
  await user.type(screen.getByLabelText("Latitude"), "19.076");
  await user.type(screen.getByLabelText("Longitude"), "72.8777");
  await user.click(screen.getByRole("button", { name: "Use manual" }));
  expect(onManual).toHaveBeenCalledWith({ latitude: 19.076, longitude: 72.8777 });
});
