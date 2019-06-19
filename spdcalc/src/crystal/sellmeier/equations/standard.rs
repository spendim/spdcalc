use super::*;
use dim::si;
use crate::utils::*;

/// Standard form:
/// > n² = A + b1 * λ² / (λ² - c1) + b2 * λ² / (λ² - c2) + b3 * λ² / (λ² - c3)
pub struct SellmeierStandard {
  pub a:  [f64 ;3],
  pub b1: [f64 ;3],
  pub b2: [f64 ;3],
  pub b3: [f64 ;3],

  pub c1: [f64 ;3],
  pub c2: [f64 ;3],
  pub c3: [f64 ;3],
}

impl SellmeierEquation for SellmeierStandard {
  fn get_indices(&self, wavelength: f64) -> Indices {
    let a = dim_vector3(si::ONE, &self.a);

    let b1 = dim_vector3(si::ONE, &self.b1);
    let b2 = dim_vector3(si::ONE, &self.b2);
    let b3 = dim_vector3(si::ONE, &self.b3);

    let c1 = dim_vector3(si::ONE, &self.c1);
    let c2 = dim_vector3(si::ONE, &self.c2);
    let c3 = dim_vector3(si::ONE, &self.c3);

    let l = wavelength * 1e6;
    let l_sq = si::ONE * l * l;
    let one_by_l_sq = Vector3::repeat(l_sq);

    let n = a
      + (
        b1.component_div( &(one_by_l_sq - c1) )
        + b2.component_div( &(one_by_l_sq - c2) )
        + b3.component_div( &(one_by_l_sq - c3) )
      ) * l_sq;

    n.apply_into( |i| si::ONE * i.sqrt() )
  }
}
