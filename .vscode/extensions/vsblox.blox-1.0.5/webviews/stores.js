import { writable } from "svelte/store";

export const selectedCard = writable(null);

export const updateKey = (card) => {
  selectedCard.set(card.split(" ")[0]);
};
