import { beforeEach, describe, expect, it } from "vitest";
import { useView, whenStageFree } from "./view";

describe("the stage", () => {
  beforeEach(() => useView.setState({ stage: [] }));

  it("is held by the first claim; the rest wait in order and take it on release", () => {
    const v = useView.getState();
    v.claimStage("showcase");
    v.claimStage("event:4");
    v.claimStage("title:5");
    v.claimStage("showcase"); // asking again doesn't requeue
    expect(useView.getState().stage).toEqual(["showcase", "event:4", "title:5"]);
    v.releaseStage("showcase");
    expect(useView.getState().stage[0]).toBe("event:4");
    v.releaseStage("title:5"); // a waiting claim can leave too
    expect(useView.getState().stage).toEqual(["event:4"]);
  });

  it("calls whenStageFree once the last holder releases, and not before", () => {
    let calls = 0;
    whenStageFree(() => calls++);
    expect(calls).toBe(1);
    useView.getState().claimStage("a");
    useView.getState().claimStage("b");
    whenStageFree(() => calls++);
    useView.getState().releaseStage("a");
    expect(calls).toBe(1);
    useView.getState().releaseStage("b");
    useView.getState().claimStage("c");
    expect(calls).toBe(2);
  });
});
