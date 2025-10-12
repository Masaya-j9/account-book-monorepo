import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

function HelloComponent() {
  return <div>Hello World</div>;
}

describe("Sample Frontend Test", () => {
  it("should pass a simple test", () => {
    expect(1 + 1).toBe(2);
  });

  it("should render a component", () => {
    render(<HelloComponent />);
    expect(screen.getByText("Hello World")).toBeDefined();
  });
});
