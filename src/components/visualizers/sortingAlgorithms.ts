export type SortStep = {
  array: number[];
  comparing: number[];
  swapping: number[];
  sorted: number[];
  description: string;
};

export type SortType = "bubble" | "selection" | "insertion";

export function generateBubbleSteps(input: number[]): SortStep[] {
  const steps: SortStep[] = [];
  const arr = [...input];
  const n = arr.length;
  const sorted = new Set<number>();
  steps.push({
    array: [...arr],
    comparing: [],
    swapping: [],
    sorted: [],
    description: `Start Bubble Sort with [${arr.join(", ")}]. Compare adjacent pairs and bubble the largest to the end.`,
  });
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - 1 - i; j++) {
      steps.push({
        array: [...arr],
        comparing: [j, j + 1],
        swapping: [],
        sorted: Array.from(sorted),
        description: `Compare arr[${j}] (${arr[j]}) and arr[${j + 1}] (${arr[j + 1]}).`,
      });
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
        steps.push({
          array: [...arr],
          comparing: [j, j + 1],
          swapping: [j, j + 1],
          sorted: Array.from(sorted),
          description: `Swap — ${arr[j + 1]} > ${arr[j]}, so swap to move larger element right.`,
        });
      } else {
        steps.push({
          array: [...arr],
          comparing: [j, j + 1],
          swapping: [],
          sorted: Array.from(sorted),
          description: `No swap — elements are in order.`,
        });
      }
    }
    sorted.add(n - 1 - i);
    steps.push({
      array: [...arr],
      comparing: [],
      swapping: [],
      sorted: Array.from(sorted),
      description: `Pass ${i + 1} complete — element at index ${n - 1 - i} is now sorted.`,
    });
  }
  sorted.add(0);
  steps.push({
    array: [...arr],
    comparing: [],
    swapping: [],
    sorted: Array.from(sorted),
    description: `Bubble Sort complete. Final sorted array: [${arr.join(", ")}]. Time O(n²), Space O(1).`,
  });
  return steps;
}

export function generateSelectionSteps(input: number[]): SortStep[] {
  const steps: SortStep[] = [];
  const arr = [...input];
  const n = arr.length;
  steps.push({
    array: [...arr],
    comparing: [],
    swapping: [],
    sorted: [],
    description: `Start Selection Sort with [${arr.join(", ")}]. Repeatedly select the minimum from unsorted part.`,
  });
  for (let i = 0; i < n - 1; i++) {
    let minIdx = i;
    steps.push({
      array: [...arr],
      comparing: [i],
      swapping: [],
      sorted: Array.from({ length: i }, (_, k) => k),
      description: `Assume arr[${i}] (${arr[i]}) is minimum for position ${i}.`,
    });
    for (let j = i + 1; j < n; j++) {
      steps.push({
        array: [...arr],
        comparing: [minIdx, j],
        swapping: [],
        sorted: Array.from({ length: i }, (_, k) => k),
        description: `Compare current min arr[${minIdx}] (${arr[minIdx]}) with arr[${j}] (${arr[j]}).`,
      });
      if (arr[j] < arr[minIdx]) {
        minIdx = j;
        steps.push({
          array: [...arr],
          comparing: [minIdx],
          swapping: [],
          sorted: Array.from({ length: i }, (_, k) => k),
          description: `New minimum found at index ${minIdx} (${arr[minIdx]}).`,
        });
      }
    }
    if (minIdx !== i) {
      [arr[i], arr[minIdx]] = [arr[minIdx], arr[i]];
      steps.push({
        array: [...arr],
        comparing: [i, minIdx],
        swapping: [i, minIdx],
        sorted: Array.from({ length: i }, (_, k) => k),
        description: `Swap min (${arr[i]}) into sorted position ${i}.`,
      });
    }
    steps.push({
      array: [...arr],
      comparing: [],
      swapping: [],
      sorted: Array.from({ length: i + 1 }, (_, k) => k),
      description: `Position ${i} sorted. Unsorted part shrinks.`,
    });
  }
  steps.push({
    array: [...arr],
    comparing: [],
    swapping: [],
    sorted: Array.from({ length: n }, (_, k) => k),
    description: `Selection Sort complete. Sorted: [${arr.join(", ")}]. Time O(n²), Space O(1).`,
  });
  return steps;
}

export function generateInsertionSteps(input: number[]): SortStep[] {
  const steps: SortStep[] = [];
  const arr = [...input];
  const n = arr.length;
  steps.push({
    array: [...arr],
    comparing: [],
    swapping: [],
    sorted: [0],
    description: `Start Insertion Sort. First element [${arr[0]}] is trivially sorted.`,
  });
  for (let i = 1; i < n; i++) {
    const key = arr[i];
    let j = i - 1;
    steps.push({
      array: [...arr],
      comparing: [i],
      swapping: [],
      sorted: Array.from({ length: i }, (_, k) => k),
      description: `Insert key arr[${i}] (${key}) into sorted prefix [0..${i - 1}].`,
    });
    while (j >= 0 && arr[j] > key) {
      steps.push({
        array: [...arr],
        comparing: [j, j + 1],
        swapping: [j, j + 1],
        sorted: Array.from({ length: i }, (_, k) => k),
        description: `Shift arr[${j}] (${arr[j]}) right — it is greater than key (${key}).`,
      });
      arr[j + 1] = arr[j];
      j--;
      steps.push({
        array: [...arr],
        comparing: [j + 1],
        swapping: [],
        sorted: Array.from({ length: i }, (_, k) => k),
        description: `Moved. Now compare next.`,
      });
    }
    arr[j + 1] = key;
    steps.push({
      array: [...arr],
      comparing: [j + 1],
      swapping: [],
      sorted: Array.from({ length: i + 1 }, (_, k) => k),
      description: `Place key (${key}) at index ${j + 1}. Prefix [0..${i}] now sorted.`,
    });
  }
  steps.push({
    array: [...arr],
    comparing: [],
    swapping: [],
    sorted: Array.from({ length: n }, (_, k) => k),
    description: `Insertion Sort complete. Sorted: [${arr.join(", ")}]. Time O(n²) worst, O(n) best.`,
  });
  return steps;
}

export function generateSteps(type: SortType, input: number[]): SortStep[] {
  switch (type) {
    case "bubble":
      return generateBubbleSteps(input);
    case "selection":
      return generateSelectionSteps(input);
    case "insertion":
      return generateInsertionSteps(input);
  }
}
