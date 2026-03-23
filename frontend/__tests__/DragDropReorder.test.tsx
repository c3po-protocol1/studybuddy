import React from "react";
import { render, screen } from "@testing-library/react";
import SpaceGrid from "@/components/SpaceGrid";

// Mock dnd-kit
jest.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  closestCenter: jest.fn(),
  PointerSensor: jest.fn(),
  KeyboardSensor: jest.fn(),
  useSensor: jest.fn(),
  useSensors: jest.fn(() => []),
}));

jest.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  verticalListSortingStrategy: "vertical",
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}));

jest.mock("@dnd-kit/utilities", () => ({
  CSS: {
    Transform: { toString: jest.fn(() => "") },
  },
}));

// Mock next/link
jest.mock("next/link", () => {
  return function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>;
  };
});

const mockSpaces = [
  { id: "1", name: "수학", emoji: "🧮", color: "#6366f1", createdAt: "2024-01-01", _count: { materials: 3 } },
  { id: "2", name: "영어", emoji: "📖", color: "#8b5cf6", createdAt: "2024-01-02", _count: { materials: 1 } },
  { id: "3", name: "과학", emoji: "🔬", color: "#22c55e", createdAt: "2024-01-03", _count: { materials: 0 } },
];

describe("SpaceGrid", () => {
  it("renders all space cards", () => {
    render(
      <SpaceGrid
        spaces={mockSpaces}
        onReorder={jest.fn()}
        onCreateClick={jest.fn()}
      />
    );

    expect(screen.getByText("수학")).toBeInTheDocument();
    expect(screen.getByText("영어")).toBeInTheDocument();
    expect(screen.getByText("과학")).toBeInTheDocument();
  });

  it("shows material counts", () => {
    render(
      <SpaceGrid
        spaces={mockSpaces}
        onReorder={jest.fn()}
        onCreateClick={jest.fn()}
      />
    );

    expect(screen.getByText("자료 3개")).toBeInTheDocument();
    expect(screen.getByText("자료 1개")).toBeInTheDocument();
    expect(screen.getByText("자료 0개")).toBeInTheDocument();
  });

  it("renders create button", () => {
    render(
      <SpaceGrid
        spaces={mockSpaces}
        onReorder={jest.fn()}
        onCreateClick={jest.fn()}
      />
    );

    expect(screen.getByText("새 스터디 공간")).toBeInTheDocument();
  });

  it("renders emojis for each space", () => {
    render(
      <SpaceGrid
        spaces={mockSpaces}
        onReorder={jest.fn()}
        onCreateClick={jest.fn()}
      />
    );

    expect(screen.getByText("🧮")).toBeInTheDocument();
    expect(screen.getByText("📖")).toBeInTheDocument();
    expect(screen.getByText("🔬")).toBeInTheDocument();
  });
});
