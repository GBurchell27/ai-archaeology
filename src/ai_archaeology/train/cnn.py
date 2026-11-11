"""A small CPU CNN on relief patches. Torch is imported only when training."""

from __future__ import annotations

import numpy as np

from ai_archaeology.train.boosting import InsufficientLabels


def fit_cnn(patches: np.ndarray, labels: np.ndarray, epochs: int, learning_rate: float, seed: int):
    torch, network = _network(int(patches.shape[1]))
    _require_both_classes(labels)
    torch.manual_seed(seed)
    device = torch.device("cpu")
    model = network.to(device)
    optimiser = torch.optim.Adam(model.parameters(), lr=learning_rate)
    loss_fn = torch.nn.BCEWithLogitsLoss()
    inputs = torch.tensor(np.asarray(patches), dtype=torch.float32, device=device)
    targets = torch.tensor(np.asarray(labels), dtype=torch.float32, device=device)
    model.train()
    for _epoch in range(epochs):
        optimiser.zero_grad()
        loss = loss_fn(model(inputs), targets)
        loss.backward()
        optimiser.step()
    model.eval()
    return model


def predict_cnn(model, patches: np.ndarray) -> np.ndarray:
    import torch

    device = torch.device("cpu")
    inputs = torch.tensor(np.asarray(patches), dtype=torch.float32, device=device)
    with torch.no_grad():
        logits = model(inputs)
    return torch.sigmoid(logits).detach().cpu().numpy()


def _network(in_channels: int):
    try:
        import torch
        from torch import nn
    except ImportError as exc:
        raise RuntimeError("the CNN extra is not installed; pip install -e '.[torch]'") from exc

    class SmallReliefNet(nn.Module):
        def __init__(self):
            super().__init__()
            self.encoder = nn.Sequential(
                nn.Conv2d(in_channels, 8, kernel_size=3, padding=1),
                nn.ReLU(),
                nn.MaxPool2d(2),
                nn.Conv2d(8, 16, kernel_size=3, padding=1),
                nn.ReLU(),
                nn.AdaptiveAvgPool2d(1),
            )
            self.score = nn.Linear(16, 1)

        def forward(self, batch):
            encoded = self.encoder(batch).flatten(1)
            return self.score(encoded).squeeze(-1)

    return torch, SmallReliefNet()


def _require_both_classes(labels: np.ndarray) -> None:
    classes = set(int(label) for label in np.asarray(labels))
    if classes != {0, 1}:
        raise InsufficientLabels(f"CNN needs both classes, found {sorted(classes)}")
