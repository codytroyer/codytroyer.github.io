(function () {
  const DEFAULT_PETS = [
    { name: "Gray Wolf", rarity: "common" },
    { name: "Lynx", rarity: "uncommon" },
    { name: "Bison", rarity: "uncommon" },
    { name: "Cheetah", rarity: "rare" },
    { name: "Moose", rarity: "rare" },
    { name: "Lion", rarity: "epic" },
    { name: "Grizzly Bear", rarity: "epic" },
    { name: "Giant Rhino", rarity: "mythical" },
    { name: "Mighty Bison", rarity: "mythical" },
    { name: "Great Moose", rarity: "mythical" },
    { name: "Alpha Black Panther", rarity: "mythical" },
  ];

  const PET_RARITY_BY_NAME = DEFAULT_PETS.reduce((acc, pet) => {
    acc[pet.name] = pet.rarity;
    return acc;
  }, {});

  window.KINGSHOT_PET_CONSTANTS = {
    DEFAULT_PETS,
    PET_RARITY_BY_NAME,
  };
})();
