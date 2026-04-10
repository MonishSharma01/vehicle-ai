# ML Module — Vehicle Failure Prediction

## Files
| File | Purpose |
|---|---|
| `generate_data.py` | Generates 2 000-row synthetic telemetry CSV |
| `train_model.py` | Trains RandomForestClassifier, saves `.pkl` |
| `test_model.py` | Loads model, runs batch + interactive predictions |
| `data/` | Generated CSV lives here |
| `saved_models/` | `vehicle_failure_model.pkl` + `label_encoder.pkl` |

## Run order
```bash
cd ml
python generate_data.py   # step 1 — create dataset
python train_model.py     # step 2 — train & save model
python test_model.py      # step 3 — test predictions
```
