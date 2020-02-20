use num::Complex;
use crate::spdc_setup::*;
use dim::ucum::Unitless;
use crate::*;
use crate::phasematch::*;

/// Calculate the Joint Spectral Amplitude of Coincidences for given parameters at specified signal/idler wavelengths.
/// **NOTE**: These are not normalized.
/// Units: 1 / Length^4
pub fn calc_jsa( spdc_setup : &SPDCSetup, l_s : Wavelength, l_i : Wavelength ) -> JSAUnits<Complex<f64>> {
  let mut signal = spdc_setup.signal.clone();
  let mut idler = spdc_setup.idler.clone();

  signal.set_wavelength(l_s);
  idler.set_wavelength(l_i);

  let spdc_setup = SPDCSetup {
    signal,
    idler,
    ..*spdc_setup
  };

  phasematch_coincidences(&spdc_setup)
}

/// Calculation the normalization factor for the coincidences JSA
/// Units: 1 / Length^4
pub fn calc_jsa_normalization(spdc_setup : &SPDCSetup) -> JSAUnits<f64> {
  let jsa_units = JSAUnits::new(1.);
  let amp = *(phasematch_coincidences(&spdc_setup.to_collinear()) / jsa_units);
  amp.norm() * jsa_units
}

/// Calculate the Joint Spectral Amplitude of Singles for given parameters at specified signal/idler wavelengths.
/// **NOTE**: These are not normalized.
/// Units: 1 / Length^4
pub fn calc_jsa_singles( spdc_setup : &SPDCSetup, l_s : Wavelength, l_i : Wavelength ) -> JSAUnits<Complex<f64>> {
  let mut signal = spdc_setup.signal.clone();
  let mut idler = spdc_setup.idler.clone();

  signal.set_wavelength(l_s);
  idler.set_wavelength(l_i);

  let spdc_setup = SPDCSetup {
    signal,
    idler,
    ..*spdc_setup
  };

  phasematch_singles(&spdc_setup)
}

/// Calculation the normalization factor for the singles JSA
/// Units: 1 / Length^4
pub fn calc_jsa_singles_normalization(spdc_setup : &SPDCSetup) -> JSAUnits<f64> {
  let jsa_units = JSAUnits::new(1.);
  let amp = *(phasematch_singles(&spdc_setup.to_collinear()) / jsa_units);
  amp.norm() * jsa_units
}

/// Calculate a normalized JSA amplitude.
/// Unitless.
pub fn calc_normalized_jsa( spdc_setup : &SPDCSetup, l_s : Wavelength, l_i : Wavelength ) -> Unitless<Complex<f64>> {
  let jsa = calc_jsa(&spdc_setup, l_s, l_i);
  let norm = calc_jsa_normalization(&spdc_setup);

  jsa / norm
}

/// Calculate the normalized JSI for given parameters at specified signal/idler wavelengths.
/// Unitless.
pub fn calc_normalized_jsi( spdc_setup : &SPDCSetup, l_s : Wavelength, l_i : Wavelength ) -> Unitless<f64> {
  // calculate the collinear phasematch to normalize against
  let norm_amp = phasematch_coincidences(&spdc_setup.to_collinear());
  let jsa = calc_jsa( &spdc_setup, l_s, l_i );

  use dim::Map;
  (jsa / norm_amp).map(|z| z.norm_sqr())
}

#[cfg(test)]
mod tests {
  // use super::*;

  // #[test]
  // fn jsi_normalization_test() {
  //   let mut spdc_setup = SPDCSetup {
  //     fiber_coupling: true,
  //     pp: Some(PeriodicPoling {
  //       sign: Sign::POSITIVE,
  //       period: 46.0 * MICRO * ucum::M,
  //       apodization: None,
  //     }),
  //     ..SPDCSetup::default()
  //   };
  //
  //   spdc_setup.crystal_setup.crystal = Crystal::BBO_1;
  //   spdc_setup.crystal_setup.theta = 0. * ucum::DEG;
  //
  //   spdc_setup.signal.set_angles(0. * ucum::RAD, 0. * ucum::RAD);
  //   spdc_setup.idler.set_angles(PI * ucum::RAD, 0. * ucum::RAD);
  //
  //   let coinc_norm = calc_jsa_normalization(&spdc_setup);
  //   let singles_norm = calc_jsa_singles_normalization(&spdc_setup);
  //
  //   dbg!(coinc_norm);
  //   dbg!(singles_norm);
  // }
}