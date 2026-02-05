---
name: tech-stack-vr-game
description: "Tech stack guidance for VR, AR, XR, and game development projects. Use for Unity, Unreal Engine, Godot, VR/AR/XR development, or game projects. Triggers: unity, unreal, godot, game dev, vr, ar, xr, mixed reality, oculus, quest, steamvr, openxr, game engine. Do NOT use for: web apps, SaaS, Node.js, React."
---

# Tech Stack: VR / AR / Game Development

## Execution Environment

- **Native engine environment** — Unity Editor
- Platform SDKs installed per target (Quest, SteamVR, etc.)

## Dependency Policy
- Minimize external dependencies
- Prefer engine-native solutions
- Raise issues on GitHub for package improvements needed

---

## Engine Selection

| Project Type | Recommended | Notes |
|--------------|-------------|-------|
| VR/AR (Quest, SteamVR) | Unity | Best XR toolkit ecosystem |

---

## Unity Stack

### Core Packages

```
// Package Manager - use these over alternatives

// XR
com.unity.xr.management          // XR plugin management
com.unity.xr.openxr              // OpenXR (cross-platform VR/AR)
com.unity.xr.interaction.toolkit // XR interaction (grab, teleport, UI)

// Input
com.unity.inputsystem            // New Input System (NOT legacy Input)

// Networking (if multiplayer)
com.unity.netcode.gameobjects    // Unity's official netcode

// Testing
com.unity.test-framework         // Unity Test Framework
```

### Project Structure

```
Assets/
├── Scripts/
│   ├── Core/           # Game systems, managers
│   ├── Player/         # Player controller, input
│   ├── Interactions/   # Grabbables, interactables
│   └── UI/             # World-space UI, menus
├── Prefabs/
├── Scenes/
├── Tests/
│   ├── EditMode/       # Unit-style tests
│   └── PlayMode/       # Integration/E2E tests
└── XR/                 # XR-specific configs
```

### Testing in Unity

```csharp
// PlayMode test example (E2E style)
[UnityTest]
public IEnumerator PlayerCanGrabObject()
{
    // Arrange - spawn player and grabbable
    var player = SpawnTestPlayer();
    var cube = SpawnGrabbable(player.transform.position + Vector3.forward);
    
    // Act - simulate grab input
    player.GetComponent<XRDirectInteractor>().StartManualInteraction(cube);
    yield return new WaitForSeconds(0.1f);
    
    // Assert
    Assert.IsTrue(cube.isSelected);
}
```

---

## XR-Specific Considerations

### Input Abstraction

Always abstract input for cross-platform:
```
// Good - abstracted
InputAction grabAction;
grabAction.performed += OnGrab;

// Bad - hardcoded
if (OVRInput.Get(OVRInput.Button.PrimaryHandTrigger))
```

### Performance Targets

| Platform | Target FPS | Notes |
|----------|------------|-------|
| Quest 2/3 | 72-120 Hz | Mobile GPU constraints |

### Testing XR Flows

E2E tests for VR/AR must cover:
- [ ] Controller tracking works
- [ ] Hand tracking (if supported)
- [ ] Grab/release interactions
- [ ] Teleportation/locomotion
- [ ] UI interaction (laser pointer, direct touch)
- [ ] Scene transitions don't break tracking

---

## Quick Reference

| Need | Unity |
|------|-------|
| XR Foundation | XR Interaction Toolkit |
| Input | Input System |
| Physics | Built-in / DOTS Physics |
| Networking | Netcode for GameObjects |
| Testing | Test Framework |
