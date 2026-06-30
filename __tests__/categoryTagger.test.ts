import { describe, it, expect } from "vitest";
import { tagCategory } from "../lib/normalization/categoryTagger";

describe("tagCategory", () => {
  it("tags Zomato as FOOD_DINING", () => {
    expect(tagCategory("Zomato")).toBe("FOOD_DINING");
  });

  it("tags Swiggy as FOOD_DINING", () => {
    expect(tagCategory("Swiggy")).toBe("FOOD_DINING");
  });

  it("tags Netflix as SUBSCRIPTIONS", () => {
    expect(tagCategory("Netflix")).toBe("SUBSCRIPTIONS");
  });

  it("tags Spotify as SUBSCRIPTIONS", () => {
    expect(tagCategory("Spotify")).toBe("SUBSCRIPTIONS");
  });

  it("tags Blue Tokai as COFFEE_CAFES", () => {
    expect(tagCategory("Blue Tokai")).toBe("COFFEE_CAFES");
  });

  it("tags Starbucks as COFFEE_CAFES", () => {
    expect(tagCategory("Starbucks")).toBe("COFFEE_CAFES");
  });

  it("tags Ola as TRANSPORT", () => {
    expect(tagCategory("Ola")).toBe("TRANSPORT");
  });

  it("tags IRCTC as TRANSPORT", () => {
    expect(tagCategory("IRCTC")).toBe("TRANSPORT");
  });

  it("tags BigBasket as GROCERIES", () => {
    expect(tagCategory("BigBasket")).toBe("GROCERIES");
  });

  it("tags Zepto as GROCERIES", () => {
    expect(tagCategory("Zepto")).toBe("GROCERIES");
  });

  it("tags Apollo Pharmacy as HEALTHCARE", () => {
    expect(tagCategory("Apollo Pharmacy")).toBe("HEALTHCARE");
  });

  it("tags Practo as HEALTHCARE", () => {
    expect(tagCategory("Practo")).toBe("HEALTHCARE");
  });

  it("tags Zerodha as INVESTMENTS", () => {
    expect(tagCategory("Zerodha")).toBe("INVESTMENTS");
  });

  it("tags Groww as INVESTMENTS", () => {
    expect(tagCategory("Groww")).toBe("INVESTMENTS");
  });

  it("tags salary keyword as SALARY_INCOME", () => {
    expect(tagCategory("", "NEFT SALARY CREDIT EMPLOYER")).toBe("SALARY_INCOME");
  });

  it("tags rent keyword as RENT_HOUSING", () => {
    expect(tagCategory("", "Monthly rent payment")).toBe("RENT_HOUSING");
  });

  it("tags Amazon as SHOPPING", () => {
    expect(tagCategory("Amazon")).toBe("SHOPPING");
  });

  it("returns OTHER for unknown merchant", () => {
    expect(tagCategory("Xyzzy Unknown Merchant 12345")).toBe("OTHER");
  });
});
