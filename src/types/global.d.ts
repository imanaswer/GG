import type Lenis from "lenis";
import type ScrollTrigger from "gsap/ScrollTrigger";

declare global {
  interface Window {
    __lenis?: Lenis;
    ScrollTrigger?: typeof ScrollTrigger;
  }
}

export {};
