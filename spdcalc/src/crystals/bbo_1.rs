//! # BBO1 Crystal
//!
//! [More Information](http://www.newlightphotonics.com/v1/bbo-properties.html)

use super::*;

pub const META :CrystalMeta = CrystalMeta {
  name: "BBO ref 1",
  reference_url: "http://www.newlightphotonics.com/bbo-properties.html",
  axis_type: OpticAxisType::NegativeUniaxial,
  point_group: PointGroup::HM_3m,
  temperature_dependence_known: true,
};

// from Newlight Photonics
const DNO :f64 = -9.3e-6;
const DNE :f64 = -16.6e-6;

/// Get refractive Indicies
///
/// ## Example
/// ```
/// use spdcalc::crystals::*;
/// let nm = 1e-9;
/// let indicies = bbo_1::get_indicies( 720.0 * nm, 293.0 );
/// let expected = Indicies(1.6607191519167868, 1.6607191519167868, 1.5420245834707935);
/// assert_eq!(indicies, expected)
/// ```
#[allow(clippy::unreadable_literal)]
pub fn get_indicies( wavelength :f64, temperature :f64 ) -> Indicies {
  let lambda_sq = (wavelength * 1.0e6).powi(2); // Convert for Sellmeir Coefficients

  let mut no = (2.7359 + 0.01878 / (lambda_sq - 0.01822) - 0.01354 * lambda_sq).sqrt();
  let mut ne = (2.3753 + 0.01224 / (lambda_sq - 0.01667) - 0.01516 * lambda_sq).sqrt();

  no += (temperature - 20.0) * DNO;
  ne += (temperature - 20.0) * DNE;

  Indicies(no, no, ne)
}