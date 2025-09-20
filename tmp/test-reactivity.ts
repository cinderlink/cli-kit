import { $state, $derived, batch, $debounced, $throttled } from "../src/components/reactivity.ts";

const a = $state(1);
const b = $derived(() => {
  const v = a();
  if (v < 5) a.set(v + 1);
  return v;
});

console.log("b()=", b());

const count = $state(0);
const deb = $debounced(count, 50);
deb.subscribe(v => console.log("debounced:", v));
count.set(1);
count.set(2);
count.set(3);

setTimeout(() => {
  console.log("deb now:", deb());
  const thr = $throttled(count, 50);
  thr.subscribe(v => console.log("throttled:", v));
  count.set(4);
  count.set(5);
  setTimeout(() => {
    count.set(6);
    console.log("done");
  }, 60);
}, 60);

