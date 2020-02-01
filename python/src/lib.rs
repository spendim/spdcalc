// python
// https://pyo3.rs/v0.9.0-alpha.1/
use pyo3::{
  prelude::*
  // wrap_pymodule,
};

mod exceptions;

mod utils;
use utils::*;

mod crystal;
use crystal::*;

mod plotting;
use plotting::*;

mod photon;
use photon::*;

#[pymodule]
fn pyspdcalc(_py : Python, m : &PyModule) -> PyResult<()> {
  m.add_class::<PlotRange2D>()?;
  m.add_class::<Crystal>()?;
  m.add_class::<CrystalSetup>()?;
  m.add_class::<Photon>()?;

  Ok(())
}
