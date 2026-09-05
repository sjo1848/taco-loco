const sauces = ["Guacamole", "Cheddar", "Criolla", "Picante", "Roquefort"];

export function SaucesInfo() { return <aside className="sauces-info"><p className="sauces-info__label">Salsas disponibles</p><p>{sauces.join(" · ")}</p></aside>; }
