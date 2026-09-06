"""
Procedural Behringer C-2 small-diaphragm condenser microphone.
Run headless:  blender --background --python build_mic.py -- <out_blend> <out_glb> [<out_png>]
Units: Blender units = meters. Real-world scale (mic ~130mm long, ~21mm dia).
"""
import bpy
import bmesh
import math
import sys
import os

# ---------------------------------------------------------------- args
argv = sys.argv
argv = argv[argv.index("--") + 1:] if "--" in argv else []
OUT_BLEND = argv[0] if len(argv) > 0 else "/tmp/behringer-c2.blend"
OUT_GLB = argv[1] if len(argv) > 1 else None
OUT_PNG = argv[2] if len(argv) > 2 else None

# ---------------------------------------------------------------- scene reset
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.unit_settings.scale_length = 1.0

# ---------------------------------------------------------------- helpers
def new_collection(name):
    col = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(col)
    return col

MAIN_COL = new_collection("BehringerC2")

def make_material(name, color, metallic=0.0, roughness=0.5):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    return mat

MAT_BODY = make_material("mic_body_champagne", (0.62, 0.55, 0.42), metallic=1.0, roughness=0.42)
MAT_GRILLE = make_material("mic_grille", (0.72, 0.66, 0.53), metallic=1.0, roughness=0.28)
MAT_BLACK = make_material("mic_black_plastic", (0.02, 0.02, 0.02), metallic=0.0, roughness=0.35)

def apply_all_modifiers(obj):
    bpy.context.view_layer.objects.active = obj
    for m in list(obj.modifiers):
        try:
            bpy.ops.object.modifier_apply(modifier=m.name)
        except RuntimeError as e:
            print("modifier apply failed", m.name, e)

def boolean_diff(base, other, apply=True):
    mod = base.modifiers.new("diff", 'BOOLEAN')
    mod.operation = 'DIFFERENCE'
    mod.object = other
    mod.solver = 'EXACT'
    if apply:
        apply_all_modifiers(base)
        bpy.data.objects.remove(other, do_unlink=True)
    return base

def wrap_flat_mesh_to_cylinder(obj, radius, z_center, angle_offset_rad):
    """Take a flat mesh lying with X=arc-length, Y=vertical height,
    Z=radial depth (0 = surface, +out, -in), and wrap it around a
    cylinder of the given radius, centered vertically at z_center and
    horizontally at angle_offset_rad (0 = +X axis, CCW)."""
    mesh = obj.data
    for v in mesh.vertices:
        x, y, z = v.co
        angle = angle_offset_rad + x / radius
        r = radius + z
        v.co.x = r * math.cos(angle)
        v.co.y = r * math.sin(angle)
        v.co.z = z_center + y
    mesh.update()
    obj.location = (0, 0, 0)

def add_wrapped_stadium_cutter(width, straight, radius, z_center, angle_deg,
                                z_lo, z_hi, name="stadium", segments=16):
    """A 'stadium' (pill) shaped volume: a half circle on top, two straight
    parallel sides, and the mirrored half circle at the bottom - wrapped onto
    the body cylinder. Used as a boolean cutter to carve a recess."""
    r = width / 2
    pts = []
    for i in range(segments + 1):
        t = math.pi * i / segments
        pts.append((r * math.cos(t), straight / 2 + r * math.sin(t)))
    for i in range(segments + 1):
        t = math.pi + math.pi * i / segments
        pts.append((r * math.cos(t), -straight / 2 + r * math.sin(t)))

    bm = bmesh.new()
    verts0 = [bm.verts.new((x, y, z_lo)) for (x, y) in pts]
    face = bm.faces.new(verts0)
    ret = bmesh.ops.extrude_face_region(bm, geom=[face])
    verts_ext = [g for g in ret["geom"] if isinstance(g, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, verts=verts_ext, vec=(0, 0, z_hi - z_lo))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)

    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    MAIN_COL.objects.link(obj)
    wrap_flat_mesh_to_cylinder(obj, radius, z_center, math.radians(angle_deg))
    return obj

# ---------------------------------------------------------------- dimensions (meters)
BODY_R = 0.0105          # 21mm diameter body
TOTAL_LEN = 0.130

Z_TOP = TOTAL_LEN
GRILLE_H = 0.015
Z_GRILLE_BASE = Z_TOP - GRILLE_H          # 0.115
COLLAR_H = 0.0035
Z_COLLAR_BASE = Z_GRILLE_BASE - COLLAR_H  # 0.1115
VENT_H = 0.004
Z_VENT_BASE = Z_COLLAR_BASE - VENT_H
SHOULDER_H = 0.010
Z_SHOULDER_BASE = Z_VENT_BASE - SHOULDER_H
XLR_H = 0.010
XLR_TAPER_H = 0.006

BAND_H = 0.007
BAND_Z = Z_SHOULDER_BASE - 0.058

FRONT_DEG = -90  # -Y side; matches the preview camera position

SWITCH_Z = Z_SHOULDER_BASE - 0.028
SWITCH_WIDTH = 0.0035
SWITCH_STRAIGHT = 0.009
SWITCH_DEPTH = 0.0007
SWITCH_HALF_SPAN = SWITCH_STRAIGHT / 2 + SWITCH_WIDTH / 2 + 0.001

# ---------------------------------------------------------------- body: single lathed (surface-of-revolution) mesh
# Building the whole silhouette as one revolved profile (bottom pole -> top
# ring) avoids boolean-unioning stacked cylinders, which is fragile when
# their end caps are exactly coplanar (classic exact-solver failure case).
EPS = 0.00003  # tiny z-offset used to create sharp steps in the profile
band_r = BODY_R * 0.94

profile = [
    (0.0, 0.0),                                   # bottom pole
    (BODY_R * 0.92, 0.0008),                      # XLR shell flare
    (BODY_R * 0.92, XLR_H),                       # XLR shell top
    (BODY_R, XLR_H + XLR_TAPER_H),                # taper up to body radius
    (BODY_R, Z_SHOULDER_BASE - 0.075),            # long plain lower body
    (BODY_R, BAND_Z - BAND_H / 2 - EPS),          # up to band
    (band_r, BAND_Z - BAND_H / 2),                # step in: band bottom
    (band_r, BAND_Z + BAND_H / 2),                # band top
    (BODY_R, BAND_Z + BAND_H / 2 + EPS),          # step back out
    (BODY_R, Z_SHOULDER_BASE - EPS),              # plain body up to shoulder
    (BODY_R, Z_SHOULDER_BASE),                    # shoulder start
    (BODY_R, Z_VENT_BASE - EPS),                  # shoulder end
    (BODY_R * 0.92, Z_VENT_BASE),                 # step in: vent groove bottom
    (BODY_R * 0.92, Z_COLLAR_BASE - EPS),         # vent groove top
    (BODY_R * 1.05, Z_COLLAR_BASE),               # step out: collar bulge
    (BODY_R * 1.05, Z_GRILLE_BASE - EPS),         # collar top
    (BODY_R, Z_GRILLE_BASE),                      # step to grille cap radius
    (BODY_R, Z_TOP - 0.0022),                     # flat cap side wall
    (BODY_R * 0.82, Z_TOP),                       # small bevel down to the flat top edge
]

bm = bmesh.new()
verts = [bm.verts.new((r, 0.0, z)) for (r, z) in profile]
for i in range(len(verts) - 1):
    bm.edges.new((verts[i], verts[i + 1]))
bmesh.ops.spin(bm, geom=list(bm.verts) + list(bm.edges), cent=(0, 0, 0),
                axis=(0, 0, 1), angle=math.radians(360), steps=64, use_duplicate=False)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-7)

# the profile ends at a non-zero radius (flat top), so the top ring is still
# an open boundary loop - cap it with a flat ngon disc.
boundary_edges = [e for e in bm.edges if e.is_boundary]
if boundary_edges:
    bmesh.ops.holes_fill(bm, edges=boundary_edges, sides=0)
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)

body_mesh = bpy.data.meshes.new("BehringerC2_Body")
bm.to_mesh(body_mesh)
bm.free()

base_obj = bpy.data.objects.new("BehringerC2_Body", body_mesh)
MAIN_COL.objects.link(base_obj)

# ---------------------------------------------------------------- pad switch recess
# "Vertiefung": half circle on top, straight parallel sides, mirrored half
# circle at the bottom (a stadium/pill shaped slot cut into the body).
switch_cutter = add_wrapped_stadium_cutter(
    SWITCH_WIDTH, SWITCH_STRAIGHT, BODY_R * 1.001, SWITCH_Z, FRONT_DEG,
    z_lo=-SWITCH_DEPTH, z_hi=0.001, name="switch_recess_cutter")
boolean_diff(base_obj, switch_cutter)

# ---------------------------------------------------------------- materials
base_obj.data.materials.append(MAT_BODY)    # index 0
base_obj.data.materials.append(MAT_GRILLE)  # collar / flat grille cap
base_obj.data.materials.append(MAT_BLACK)   # vent groove, band, xlr shell, switch recess

mesh = base_obj.data
# Applying the boolean modifier can insert an extra empty slot at index 0 to
# reconcile material tables between the two operand meshes, so look slots up
# by name instead of relying on the literal append order.
IDX_BODY = mesh.materials.find(MAT_BODY.name)
IDX_GRILLE = mesh.materials.find(MAT_GRILLE.name)
IDX_BLACK = mesh.materials.find(MAT_BLACK.name)

def polygon_material_index(poly):
    verts_co = [mesh.vertices[vi].co for vi in poly.vertices]
    xc = sum(v.x for v in verts_co) / len(verts_co)
    yc = sum(v.y for v in verts_co) / len(verts_co)
    zc = sum(v.z for v in verts_co) / len(verts_co)
    r_xy = math.hypot(xc, yc)

    if (r_xy < BODY_R * 0.995 and yc < -BODY_R * 0.3 and
            SWITCH_Z - SWITCH_HALF_SPAN <= zc <= SWITCH_Z + SWITCH_HALF_SPAN):
        return IDX_BLACK  # switch recess
    if zc <= XLR_H + XLR_TAPER_H * 0.5:
        return IDX_BLACK  # xlr shell
    if BAND_Z - BAND_H / 2 - EPS <= zc <= BAND_Z + BAND_H / 2 + EPS:
        return IDX_BLACK  # wordmark band
    if Z_VENT_BASE - EPS <= zc <= Z_COLLAR_BASE + EPS:
        return IDX_BLACK  # vent groove
    if zc >= Z_COLLAR_BASE - EPS:
        return IDX_GRILLE  # collar + flat grille cap
    return IDX_BODY  # plain champagne body

for poly in mesh.polygons:
    poly.material_index = polygon_material_index(poly)

base_obj.select_set(True)
bpy.context.view_layer.objects.active = base_obj
bpy.ops.object.shade_smooth()
base_obj.select_set(False)

# ---------------------------------------------------------------- finalize collection / export
os.makedirs(os.path.dirname(OUT_BLEND), exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND)
print("Saved blend:", OUT_BLEND)

if OUT_GLB:
    bpy.ops.object.select_all(action='DESELECT')
    for obj in MAIN_COL.objects:
        obj.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=OUT_GLB,
        use_selection=True,
        export_apply=True,
        export_yup=True,
    )
    print("Saved glb:", OUT_GLB)

if OUT_PNG:
    mic_center = (0, 0, TOTAL_LEN * 0.5)
    bpy.ops.object.empty_add(type='PLAIN_AXES', location=mic_center)
    target = bpy.context.active_object
    target.name = "cam_target"

    bpy.ops.object.camera_add(location=(0.11, -0.24, TOTAL_LEN * 0.58))
    cam = bpy.context.active_object
    scene.camera = cam
    cam.data.lens = 50
    track = cam.constraints.new(type='TRACK_TO')
    track.target = target
    track.track_axis = 'TRACK_NEGATIVE_Z'
    track.up_axis = 'UP_Y'

    def add_light(name, loc, energy, size=0.06):
        bpy.ops.object.light_add(type='AREA', location=loc)
        light = bpy.context.active_object
        light.name = name
        light.data.energy = energy
        light.data.size = size
        ltrack = light.constraints.new(type='TRACK_TO')
        ltrack.target = target
        ltrack.track_axis = 'TRACK_NEGATIVE_Z'
        ltrack.up_axis = 'UP_Y'
        return light

    add_light("key", (0.25, -0.30, 0.30), 24)
    add_light("fill", (-0.30, -0.15, 0.10), 10)
    add_light("rim", (0.05, 0.28, 0.20), 16)

    world = bpy.data.worlds.new("World")
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = (0.05, 0.05, 0.055, 1)
    world.node_tree.nodes["Background"].inputs[1].default_value = 1.0

    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 96
    scene.render.resolution_x = 700
    scene.render.resolution_y = 1300
    scene.render.filepath = OUT_PNG
    bpy.ops.render.render(write_still=True)
    print("Saved render:", OUT_PNG)
