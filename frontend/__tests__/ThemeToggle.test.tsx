import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import ThemeToggle from "@/components/ThemeToggle";
import { ThemeProvider, useTheme } from "@/components/ThemeProvider";

// Mock matchMedia
const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
};

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove("dark");
  mockMatchMedia(false);
});

describe("ThemeToggle", () => {
  it("renders the toggle button", () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );
    expect(screen.getByRole("button", { name: /테마/i })).toBeInTheDocument();
  });

  it("cycles through light → dark → system modes on click", () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );
    const btn = screen.getByRole("button", { name: /테마/i });

    // Default is system, click to switch to light
    fireEvent.click(btn);
    expect(localStorage.getItem("theme")).toBe("light");

    // Click to switch to dark
    fireEvent.click(btn);
    expect(localStorage.getItem("theme")).toBe("dark");

    // Click to switch back to system
    fireEvent.click(btn);
    expect(localStorage.getItem("theme")).toBe("system");
  });
});

describe("ThemeProvider", () => {
  it("persists theme preference in localStorage", () => {
    localStorage.setItem("theme", "dark");

    function TestComponent() {
      const { theme } = useTheme();
      return <div data-testid="theme">{theme}</div>;
    }

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId("theme").textContent).toBe("dark");
  });

  it("applies dark class to html element when theme is dark", () => {
    localStorage.setItem("theme", "dark");

    render(
      <ThemeProvider>
        <div>test</div>
      </ThemeProvider>
    );

    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("removes dark class when theme is light", () => {
    localStorage.setItem("theme", "light");

    render(
      <ThemeProvider>
        <div>test</div>
      </ThemeProvider>
    );

    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("uses system preference when theme is system", () => {
    localStorage.setItem("theme", "system");
    mockMatchMedia(true); // system prefers dark

    render(
      <ThemeProvider>
        <div>test</div>
      </ThemeProvider>
    );

    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});
