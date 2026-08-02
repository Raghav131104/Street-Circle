import { useContext } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AuthModal from "../components/AuthModal";
import { AuthProvider } from "../context/AuthContext";
import { AuthContext } from "../context/auth-context";
import { authenticate, getAuthenticatedUser } from "../services/api";

vi.mock("../services/api", () => ({
  authenticate: vi.fn(),
  getAuthenticatedUser: vi.fn(),
  revokeSession: vi.fn(),
}));

function Identity() {
  const { user } = useContext(AuthContext);
  return <span>{user ? user.username : "guest"}</span>;
}

describe("authentication UI", () => {
  beforeEach(() => vi.clearAllMocks());

  it("waits for server authentication initialization before rendering children", async () => {
    getAuthenticatedUser.mockResolvedValue({ id: "user-1", username: "raghav" });
    render(<AuthProvider><Identity/></AuthProvider>);
    expect(screen.queryByText("raghav")).not.toBeInTheDocument();
    expect(await screen.findByText("raghav")).toBeInTheDocument();
  });

  it("renders a guest after the server reports no active session", async () => {
    getAuthenticatedUser.mockRejectedValue(new Error("unauthenticated"));
    render(<AuthProvider><Identity/></AuthProvider>);
    expect(await screen.findByText("guest")).toBeInTheDocument();
  });

  it("exposes an accessible login dialog and displays the server error", async () => {
    authenticate.mockRejectedValue({ response: { data: { error: { message: "Invalid username/email or password" } } } });
    const user = userEvent.setup();
    render(<AuthContext.Provider value={{ login: vi.fn() }}><AuthModal isOpen onClose={vi.fn()}/></AuthContext.Provider>);
    expect(screen.getByRole("dialog", { name: "Welcome Back" })).toBeInTheDocument();
    await user.type(screen.getByLabelText("Username or email"), "unknown");
    await user.type(screen.getByLabelText("Password"), "incorrect-password");
    await user.click(screen.getByRole("button", { name: "Log In" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid username/email or password");
  });

  it("registration asks only for fields accepted by the server contract", async () => {
    const user = userEvent.setup();
    render(<AuthContext.Provider value={{ login: vi.fn() }}><AuthModal isOpen onClose={vi.fn()}/></AuthContext.Provider>);
    await user.click(screen.getByRole("button", { name: "Sign Up" }));
    expect(screen.getByRole("dialog", { name: "Join StreetCircle" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeRequired();
    expect(screen.getByLabelText("Username")).toHaveAttribute("minlength", "3");
    expect(screen.getByLabelText("Password")).toHaveAttribute("minlength", "10");
    expect(screen.getByText(/use 10–128 characters/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/phone/i)).not.toBeInTheDocument();
  });

  it("displays field-level registration validation returned by the API", async () => {
    authenticate.mockRejectedValue({ response: { data: { error: {
      message: "Request validation failed",
      details: [{ path: "password", message: "Password must be at least 10 characters" }],
    } } } });
    const user = userEvent.setup();
    render(<AuthContext.Provider value={{ login: vi.fn() }}><AuthModal isOpen onClose={vi.fn()}/></AuthContext.Provider>);
    await user.click(screen.getByRole("button", { name: "Sign Up" }));
    await user.type(screen.getByLabelText("Username"), "raghav");
    await user.type(screen.getByLabelText("Email"), "raghav@example.com");
    await user.type(screen.getByLabelText("Password"), "valid-password");
    await user.click(screen.getByRole("button", { name: "Sign Up" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Password: Password must be at least 10 characters");
  });
});
