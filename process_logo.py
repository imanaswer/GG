import cv2
import numpy as np

# Load image with alpha channel
img = cv2.imread('public/logo2.png', cv2.IMREAD_UNCHANGED)

if img is None:
    print("Could not load public/logo2.png")
    exit(1)

# Ensure it has an alpha channel
if img.shape[2] == 3:
    img = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)

# Extract channels
b, g, r, a = cv2.split(img)

# Find "red" pixels.
# The logo's red is typically high in R, low in B and G.
# White text is high in R, G, B.
# So red pixels can be found where R > 100, B < 100, G < 100.
# Let's just use a simple threshold: red channel dominates
red_mask = (r > 150) & (b < 150) & (g < 150) & (a > 50)
red_mask = red_mask.astype(np.uint8) * 255

# Find connected components of the red mask
num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(red_mask, connectivity=8)

# The background is label 0.
# The red components are label 1, 2, ...
# We want to find the largest red component (the main shape) and keep it, and delete the smaller ones.
if num_labels > 2:
    # There are at least two red components.
    # Find the largest one (excluding background label 0)
    areas = stats[1:, cv2.CC_STAT_AREA]
    largest_label = np.argmax(areas) + 1
    
    # Create a mask for components to delete
    delete_mask = np.zeros_like(red_mask)
    for i in range(1, num_labels):
        if i != largest_label:
            delete_mask[labels == i] = 255
            
    # Make the deleted components transparent
    a[delete_mask == 255] = 0

# Now change all non-transparent pixels to white
non_transparent = a > 0
b[non_transparent] = 255
g[non_transparent] = 255
r[non_transparent] = 255

# Merge back
out_img = cv2.merge((b, g, r, a))

cv2.imwrite('public/logo-white.png', out_img)
print("Saved to public/logo-white.png")
