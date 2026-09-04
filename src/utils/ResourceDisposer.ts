import * as THREE from 'three';

export class ResourceDisposer {
  /**
   * Recursively traverses and disposes all geometries, materials, and textures
   * within an Object3D hierarchy, then detaches all children.
   */
  public static disposeTree(root: THREE.Object3D): void {
    root.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh || (child as THREE.Line).isLine || (child as THREE.Points).isPoints) {
        if (mesh.geometry) {
          mesh.geometry.dispose();
        }
        if (mesh.material) {
          this.disposeMaterial(mesh.material);
        }
      }
    });

    while (root.children.length > 0) {
      root.remove(root.children[0]);
    }
  }

  /**
   * Disposes a Material or an array of Materials, including associated textures.
   */
  public static disposeMaterial(material: THREE.Material | THREE.Material[]): void {
    if (Array.isArray(material)) {
      material.forEach((mat) => this.disposeSingleMaterial(mat));
    } else if (material) {
      this.disposeSingleMaterial(material);
    }
  }

  private static disposeSingleMaterial(mat: THREE.Material): void {
    const matAny = mat as unknown as Record<string, unknown>;
    for (const key of Object.keys(matAny)) {
      const val = matAny[key];
      if (val && typeof val === 'object' && (val as THREE.Texture).isTexture) {
        (val as THREE.Texture).dispose();
      }
    }
    mat.dispose();
  }
}
