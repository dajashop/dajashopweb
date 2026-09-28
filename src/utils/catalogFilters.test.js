import assert from 'node:assert/strict';
import test from 'node:test';
import { filterCatalogProducts } from './catalogFilters.js';

const products = [
  { name: 'A', brand: 'CASIO', category: 'Classic', gender: 'Muški', price: 100, specs: { mehanizam: 'Kvarcni', datum: 'Da' } },
  { name: 'B', brand: 'CASIO', category: 'Sport', gender: 'Ženski', price: 150, specs: { mehanizam: 'Automatski' } },
  { name: 'C', brand: 'Daniel Klein', category: 'Classic', gender: 'Muški', price: 200, specs: { mehanizam: 'Kvarcni' } },
  { name: 'D', brand: 'Daniel Klein', category: 'Classic', gender: 'Ženski', price: 250, specs: { datum: 'Ne' } },
];

test('brand, gender and collection select only matching products', () => {
  const params = new URLSearchParams('brand=Daniel+Klein&gender=Mu%C5%A1ki&category=Classic');
  assert.deepEqual(filterCatalogProducts(products, params).map((product) => product.name), ['C']);
});

test('a fixed gender also limits the options on a dedicated catalog page', () => {
  const params = new URLSearchParams('brand=CASIO');
  assert.deepEqual(filterCatalogProducts(products, params, { fixedGender: 'Ženski' }).map((product) => product.name), ['B']);
});

test('facet counts can ignore their own selection while respecting the other filters', () => {
  const params = new URLSearchParams('brand=CASIO&category=Classic&spec_mehanizam=Kvarcni');
  assert.deepEqual(filterCatalogProducts(products, params).map((product) => product.name), ['A']);
  assert.deepEqual(filterCatalogProducts(products, params, { ignoreKey: 'brand' }).map((product) => product.name), ['A', 'C']);
  assert.deepEqual(filterCatalogProducts(products, params, { ignoreKey: 'spec_mehanizam' }).map((product) => product.name), ['A']);
});
