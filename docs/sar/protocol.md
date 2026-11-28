# SAR Doppler tomography feasibility protocol

This study tests whether a single satellite SAR acquisition contains enough information to recover known voids indirectly. It starts with published benchmarks and controlled signals. The repository's atlas and susceptibility layers remain outside the experiment. [Research issue #17](https://github.com/GBurchell27/ai-archaeology/issues/17)

## What the experiment measures

The proposed chain is elastic-wave propagation, a perturbation from a void, displacement of surface scatterers, a measurable radar response, and recovery of depth from that response. Each link needs independent evidence. For a monostatic radar the magnitude of the displacement-to-phase factor is `4π / λ` radians per metre along the line of sight. The sign follows the range and phase conventions. Coherent surface motion, nuisance motion and phase error all affect the same observable.

Multi-baseline TomoSAR uses viewing diversity to resolve scatterers in elevation. Repeat-pass InSAR uses differential phase between acquisitions. Intra-aperture motion estimation uses changes in a single acquisition. Recovering void geometry from that motion adds an elastic inverse problem. [Method and evidence audit](method-audit.md)

## Decision gates

| Gate | Required evidence | Outcome in this PR |
| --- | --- | --- |
| A. Observability | Recover a bounded band of injected motion across amplitude, frequency and noise sweeps. Estimate effective aperture time, effective sublook bandwidth, spatial resolution and phase stability. Compare predicted cavity and no-cavity surface signals with sensor noise and varied sources and geology. | Unevaluated. Catalogue discovery measures none of these quantities. |
| B. Motion recovery | Compare motion amplitude and frequency estimates with synthetic truth and report uncertainty and false responses on static and moving surface controls. For a calibrated real-data claim, validate with independent sensor measurements of a known vibrating target. | Unevaluated. Real-data motion proxies remain uncalibrated without independent measurements. |
| C. Subsurface validation | Demonstrate repeatable held-out recovery over a stated depth and size range, beating null and surface-only baselines at a preregistered false-positive rate. | Unevaluated. Held-out geometry and acquisitions are pending. |

If motion or cavity perturbations fall below observability, report the sensitivity limits. If motion is measurable but depth estimates are poorly constrained, report the ambiguity. Where the available acquisition differs materially from the claimed sensor or mode, report which inference remains inconclusive. Archive all runs, including failed and null cases.

## Benchmark and scoring rules

1. Use site-level splits. Reserve Khufu's documented chambers for non-blind calibration. Keep repeated acquisitions and nearby slices from the same facility together. Before held-out evaluation, freeze the eligible sites, scene IDs, exclusion rules, calibration settings and masked survey volumes in a dated, versioned register. [Benchmark register](benchmark-register.md)
2. Pilot a published positive target and a matched surveyed negative. Use homogeneous and layered solid-rock simulations, noise, phase randomization and spatial shuffling to estimate false positives. Compare with random, amplitude-only or other surface-only, and conventional geophysical baselines where comparable data exist. Keep the forward simulation and reconstruction grids and model assumptions distinct.
3. Freeze the minimum target size, one-to-one matching tolerance, maximum acceptable false-positive density and required baseline improvement before scoring. Justify numerical thresholds from the eligible survey geometry, its uncertainty and the intended use. Keep withheld ground truth out of scene selection and all tuned processing. The thresholds and held-out split are pending, so held-out scoring has yet to begin.
4. Report object-level precision and recall, false positives per surveyed area or volume, matched depth and centroid errors in metres, and size error and volumetric IoU where there are complete reference masks. Report repeat-acquisition agreement, uncertainty coverage and performance by depth, size and geology. Estimate uncertainty at the site level and report individual results when there are too few sites for a stable interval. Record depth relative to an explicit datum and distinguish voxel spacing from resolving power.
5. For later experimental runs record the code commit, versioned configuration, random seeds, scene IDs and hashes, relevant metadata and all failed or excluded runs. Keep raw products and precise results in the gitignored local directories. Share coarse locations only, and restrict experimental visualization until Gate C is met.

## Reproduce catalogue discovery

Run from the repository root with Python 3.11 or newer. This slice uses the Python standard library. With an editable install, omit the `PYTHONPATH` setting.

```bash
export PYTHONPATH=src
python -m ai_archaeology.sar.cli search --site khufu --start 2024-01-01 --end 2024-01-31 --product SLC --mode IW --polarization VV+VH --orbit-direction ascending --limit 2
python -m unittest discover -s tests -p 'test_sar_*.py' -v
```

For PowerShell, use `$env:PYTHONPATH = 'src'` on the first line. Append `--live` to the search command to fetch public catalogue metadata. The default command prints the plan without a network request. The live command accepts a published site ID from a fixed list and sends its coarse search footprint to ASF. Dates are inclusive UTC acquisition-start dates. Polarization is the exact acquisition combination, so `VV+VH` selects dual-pol products while `VV` selects single-pol products.

The output records the endpoint, request parameters, retrieval time, ASF product IDs, processing version when reported, and rejection reasons. The limit applies to the records returned by ASF before local filtering. Treat a result that reaches the limit as potentially incomplete. Scene footprints, imagery, browse previews, SAFE files, and asset URLs are outside the output.

`--incidence 30 42` applies an inclusive filter to a reported catalogue incidence angle in degrees. ASF's Sentinel-1 catalogue can omit this field, as it did on the January 2024 Khufu smoke query. Missing values are reported as null for an unrestricted search and receive an explicit rejection when a range is requested. ASF's off-nadir field and a mode-wide nominal angle are unsuitable substitutes for site-specific incidence. Confirm the site and burst geometry against SAFE annotation in a later acquisition phase. Likewise, a catalogue footprint intersecting the search box only establishes a possible match. [ASF search fields](https://docs.asf.alaska.edu/api/keywords/) · [SAR data and licence register](../data-sources.md#sar-doppler-feasibility-study)
