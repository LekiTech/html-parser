function partitionElementsByPosition(elements: Node[], threshold: number) {
  const list1 = [];
  const list2 = [];
  let addingToList1 = true;
  elements.forEach((el) => {
    if (addingToList1 && el.nodeType !== 3) {
      // @ts-ignore
      const rect = el.getBoundingClientRect();
      if (rect.x + rect.width >= threshold) {
        addingToList1 = false;
      }
    }
    if (addingToList1) {
      list1.push(el);
    } else {
      list2.push(el);
    }
  });

  return [list1, list2];
}

// test run
let [list1, list2] = partitionElementsByPosition(
  [
    ...[...document.querySelectorAll('#pf2 div.ws0')].filter(
      //@ts-ignore
      (el) => el.innerText.trim().length > 1,
    )[1].childNodes,
  ],
  843,
);

// Parse pages FROM page ID="pf18" TO page ID="pfaf"
const pages = [...document.getElementById('page-container').children];
