export default class Product {
  constructor({
    id,
    brand,
    name,
    slug,
    price,
    oldPrice = null,
    gender = null,
    category = null,
    image,
    specs = {},
    model3DUrl = null,
    department = 'satovi', // <--- NOVO: Podrazumevano je satovi
    seo = {},
  }) {
    this.id = id;
    this.brand = brand;
    this.name = name;
    this.slug = slug;
    this.price = price;
    this.oldPrice = oldPrice;
    this.gender = gender;
    this.category = category;
    this.image = image;
    this.specs = specs;
    this.model3DUrl = model3DUrl;
    this.department = department;
    this.seo = seo;
  }
}
