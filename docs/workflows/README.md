# Livex Engineering Workflows

This directory contains the mandatory engineering workflows that govern all development on the Livex platform. These workflows are permanent and must be followed for every task.

---

## Contents

| Document                                                         | Description                                       |
| ---------------------------------------------------------------- | ------------------------------------------------- |
| [global-engineering-workflow.md](global-engineering-workflow.md) | The 12-step mandatory workflow for every task     |
| [architectural-invariant.md](architectural-invariant.md)         | Shared-first development rule and system registry |
| [android-emulator-verification-protocol.md](android-emulator-verification-protocol.md) | Native Android Studio emulator & ADB verification protocol (production release gate) |

## Rules

- Every task must follow the [Global Engineering Workflow](global-engineering-workflow.md). No steps may be skipped.
- Before implementing any feature, check the [Architectural Invariant](architectural-invariant.md) to determine if it belongs to a shared system.
- When a new workflow is discovered or refined, add it to this directory.
- These documents are permanent and must survive between chats, releases, and contributors.
