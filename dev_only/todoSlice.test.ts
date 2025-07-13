import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import reducer, { addTodo, updateTodo, deleteTodo } from "../todoSlice";
import { getFromLocalStorage } from "../src/lib/utils/persistMiddleware";
import { nanoid } from "@reduxjs/toolkit";

vi.mock("@reduxjs/toolkit", async () => {
	const actual = await vi.importActual<typeof import("@reduxjs/toolkit")>(
		"@reduxjs/toolkit"
	);
	return {
		...actual,
		nanoid: vi.fn(() => "mocked-id"),
	};
});

vi.mock("../../utils/persistMiddleware", () => ({
	getFromLocalStorage: vi.fn(() => null),
}));

const mockId = "mocked-id";
const initialTodo = {
	uid: mockId,
	task: "",
	target: "",
	status: "",
};

describe("todoSlice", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		(getFromLocalStorage as Mock).mockReturnValue(null);
		(nanoid as Mock).mockReturnValue(mockId);
	});

	it("should initialize with default todo if no localStorage data", () => {
		const state = reducer(undefined, { type: "init" });
		expect(state).toEqual([initialTodo]);
	});

	it("should add a todo", () => {
		const newTodo = {
			task: "Write tests",
			target: "Today",
			status: "Pending",
		};
		const action = addTodo(newTodo);
		const state = reducer([initialTodo], action);
		expect(state).toHaveLength(2);
		expect(state[1]).toEqual({ uid: mockId, ...newTodo });
	});

	it("should update a todo field", () => {
		const action = updateTodo({
			id: mockId,
			key: "status",
			value: "Done",
		});
		const state = reducer([initialTodo], action);
		expect(state[0].status).toBe("Done");
	});

	it("should clear fields if only one todo and deleted", () => {
		const action = deleteTodo({ uid: mockId, length: 1 });
		const state = reducer([initialTodo], action);
		expect(state).toEqual([
			{ uid: mockId, task: "", target: "", status: "" },
		]);
	});

	it("should remove todo if more than one exists", () => {
		const secondId = "another-id";
		const state = reducer(
			[
				initialTodo,
				{
					uid: secondId,
					task: "Another",
					target: "Tomorrow",
					status: "Pending",
				},
			],
			deleteTodo({ uid: mockId, length: 2 })
		);
		expect(state).toHaveLength(1);
		expect(state[0].uid).toBe(secondId);
	});
});
