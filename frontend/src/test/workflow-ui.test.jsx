import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import NotificationsPanel from "../components/NotificationsPanel";
import PostListingModal from "../components/PostListingModal";
import RequestModal from "../components/RequestModal";

it("listing dialog is accessible and surfaces a server validation error", async () => {
  const onSubmit = vi.fn().mockRejectedValue({ response: { data: { error: { message: "Active community membership required" } } } });
  const user = userEvent.setup();
  render(<PostListingModal isOpen onClose={vi.fn()} onSubmit={onSubmit} communities={[{ id: "community-1", name: "Bandra Circle" }]}/>);
  expect(screen.getByRole("dialog", { name: "Post new listing" })).toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText("Community"), "community-1");
  await user.type(screen.getByLabelText("Title"), "Power drill");
  await user.clear(screen.getByLabelText("Category"));
  await user.type(screen.getByLabelText("Category"), "tools");
  await user.type(screen.getByLabelText("Description"), "Available for a weekend project");
  await user.click(screen.getByRole("button", { name: "Post Listing" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Active community membership required");
});

it("request dialog waits for its async command and closes after success", async () => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  const user = userEvent.setup();
  render(<RequestModal listing={{ id: "listing-1", title: "Power drill" }} onClose={onClose} onSubmit={onSubmit}/>);
  expect(screen.getByRole("dialog", { name: "Request Power drill" })).toBeInTheDocument();
  await user.type(screen.getByLabelText("Message (optional)"), "Can I collect it tomorrow?");
  await user.click(screen.getByRole("button", { name: "Send request" }));
  expect(onSubmit).toHaveBeenCalledWith("listing-1", "Can I collect it tomorrow?");
  expect(onClose).toHaveBeenCalled();
});

it("notification actions distinguish unread state and delegate user commands", async () => {
  const onRead = vi.fn();
  const onReadAll = vi.fn();
  const user = userEvent.setup();
  render(<NotificationsPanel
    notifications={[{ id: "notification-1", title: "Request accepted", body: "Your request is now accepted.", readAt: null, createdAt: "2026-08-02T00:00:00.000Z" }]}
    unreadCount={1}
    nextCursor={null}
    error=""
    onRead={onRead}
    onReadAll={onReadAll}
    onLoadMore={vi.fn()}
  />);
  await user.click(screen.getByRole("button", { name: "Mark read" }));
  expect(onRead).toHaveBeenCalledWith("notification-1");
  await user.click(screen.getByRole("button", { name: "Mark all read" }));
  expect(onReadAll).toHaveBeenCalled();
});
