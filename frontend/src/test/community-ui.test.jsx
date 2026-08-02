import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import CommunityPanel from "../components/CommunityPanel";
import { getCommunities, joinCommunity } from "../services/api";

vi.mock("../services/api", () => ({
  createCommunity: vi.fn(),
  decideCommunityMembership: vi.fn(),
  getCommunities: vi.fn(),
  getCommunityMemberships: vi.fn(),
  joinCommunity: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  getCommunities.mockResolvedValue([{
    id: "community-1", name: "Bandra Circle", description: "Neighbors sharing useful items and skills.",
  }]);
  joinCommunity.mockResolvedValue({ id: "membership-1", status: "pending" });
});

it("lists discoverable communities and sends a join request", async () => {
  const onChanged = vi.fn().mockResolvedValue(undefined);
  const user = userEvent.setup();
  render(<CommunityPanel memberships={[]} location={{ latitude: 19.076, longitude: 72.8777 }} onChanged={onChanged}/>);
  expect(await screen.findByText("Bandra Circle")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Request to join" }));
  expect(joinCommunity).toHaveBeenCalledWith("community-1");
  expect(onChanged).toHaveBeenCalled();
});
