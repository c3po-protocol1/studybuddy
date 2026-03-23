import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock api-client
jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

// Mock next/link
jest.mock("next/link", () => {
  return function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>;
  };
});

// Mock auth-store
jest.mock("@/lib/auth-store", () => ({
  getUser: () => ({ id: "user-1", email: "test@test.com" }),
  isAuthenticated: () => true,
}));

import { apiClient } from "@/lib/api-client";
import GroupListPage from "@/app/groups/page";
import CreateGroupModal from "@/components/CreateGroupModal";

const mockGroups = [
  {
    id: "g1",
    name: "수학 스터디",
    emoji: "🧮",
    description: "수학을 함께",
    ownerId: "user-1",
    memberCount: 3,
    createdAt: "2024-01-01",
  },
  {
    id: "g2",
    name: "영어 스터디",
    emoji: "📖",
    description: "영어 공부",
    ownerId: "user-2",
    memberCount: 5,
    createdAt: "2024-01-02",
  },
];

describe("GroupListPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the groups page title", async () => {
    (apiClient.get as jest.Mock).mockResolvedValue(mockGroups);

    render(<GroupListPage />);

    expect(screen.getByText("스터디 그룹")).toBeInTheDocument();
  });

  it("renders group cards after loading", async () => {
    (apiClient.get as jest.Mock).mockResolvedValue(mockGroups);

    render(<GroupListPage />);

    await waitFor(() => {
      expect(screen.getByText("수학 스터디")).toBeInTheDocument();
      expect(screen.getByText("영어 스터디")).toBeInTheDocument();
    });
  });

  it("shows member count on group cards", async () => {
    (apiClient.get as jest.Mock).mockResolvedValue(mockGroups);

    render(<GroupListPage />);

    await waitFor(() => {
      expect(screen.getByText(/3명/)).toBeInTheDocument();
      expect(screen.getByText(/5명/)).toBeInTheDocument();
    });
  });

  it("shows empty state when no groups exist", async () => {
    (apiClient.get as jest.Mock).mockResolvedValue([]);

    render(<GroupListPage />);

    await waitFor(() => {
      expect(screen.getByText(/아직 스터디 그룹이 없어요/)).toBeInTheDocument();
    });
  });

  it("shows create group button", async () => {
    (apiClient.get as jest.Mock).mockResolvedValue([]);

    render(<GroupListPage />);

    expect(screen.getByText(/새 그룹/)).toBeInTheDocument();
  });
});

describe("CreateGroupModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the modal with form fields", () => {
    render(<CreateGroupModal onClose={jest.fn()} onCreated={jest.fn()} />);

    expect(screen.getByText("새 스터디 그룹 만들기")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/예:/)).toBeInTheDocument();
  });

  it("calls onCreated after successful submission", async () => {
    const onCreated = jest.fn();
    (apiClient.post as jest.Mock).mockResolvedValue({ id: "new-group" });

    render(<CreateGroupModal onClose={jest.fn()} onCreated={onCreated} />);

    const nameInput = screen.getByPlaceholderText(/예:/);
    fireEvent.change(nameInput, { target: { value: "새 그룹 이름" } });

    const submitBtn = screen.getByText("만들기");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onCreated).toHaveBeenCalled();
    });
  });

  it("shows error for empty name", async () => {
    render(<CreateGroupModal onClose={jest.fn()} onCreated={jest.fn()} />);

    const submitBtn = screen.getByText("만들기");
    fireEvent.click(submitBtn);

    expect(screen.getByText("이름을 입력해주세요.")).toBeInTheDocument();
  });

  it("calls onClose when cancel is clicked", () => {
    const onClose = jest.fn();
    render(<CreateGroupModal onClose={onClose} onCreated={jest.fn()} />);

    fireEvent.click(screen.getByText("취소"));
    expect(onClose).toHaveBeenCalled();
  });
});
